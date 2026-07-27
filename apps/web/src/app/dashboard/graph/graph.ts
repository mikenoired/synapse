import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";

export type GraphNodeInput = {
	id: string;
	label: string;
	links: string[];
	type: string;
	href?: string;
};

export type GraphInput = {
	nodes: GraphNodeInput[];
};

type NodeState = GraphNodeInput & {
	degree: number;
	vx: number;
	vy: number;
	x: number;
	y: number;
};

type PointerState =
	| {
			id: number;
			kind: "node";
			moved: boolean;
			node: NodeState;
			offsetX: number;
			offsetY: number;
	  }
	| {
			id: number;
			kind: "pan";
			startPanX: number;
			startPanY: number;
			startX: number;
			startY: number;
	  };

const nodeRadius = (node: NodeState) => Math.max(7, Math.min(Math.sqrt(node.degree + 1) * 3.5, 22));

type GraphColors = {
	contentNode: number;
	tagNode: number;
	line: number;
	text: number;
};

export type GraphCallbacks = {
	onNodeClick?: (nodeId: string, nodeType: string) => void;
	onNodeHover?: (nodeId: string, x: number, y: number) => void;
	onNodeLeave?: () => void;
};

export function createGraph(container: HTMLElement, data: GraphInput, callbacks?: GraphCallbacks) {
	return new GraphRenderer(container, data, callbacks);
}

class GraphRenderer {
	private app: Application<HTMLCanvasElement>;
	private content = new Container();
	private links = new Graphics();
	private nodes = new Graphics();
	private labels = new Container();
	private labelById = new Map<string, Text>();
	private nodeById = new Map<string, NodeState>();
	private edges: Array<[NodeState, NodeState]> = [];
	private pointer: PointerState | null = null;
	private raf = 0;
	private panX = 0;
	private panY = 0;
	private scale = 1;
	private targetScale = 1;
	private resizeObserver: ResizeObserver;
	private themeObserver: MutationObserver;
	private colors: GraphColors;
	private callbacks?: GraphCallbacks;
	private hoverTimer: NodeJS.Timeout | null = null;
	private hoveredNode: NodeState | null = null;

	constructor(
		private readonly container: HTMLElement,
		data: GraphInput,
		callbacks?: GraphCallbacks
	) {
		this.callbacks = callbacks;
		this.colors = readGraphColors(container);
		this.app = new Application<HTMLCanvasElement>({
			antialias: true,
			autoDensity: true,
			autoStart: false,
			backgroundAlpha: 0,
			resolution: window.devicePixelRatio || 1,
		});
		container.replaceChildren(this.app.view);
		this.app.view.style.display = "block";
		this.app.view.style.height = "100%";
		this.app.view.style.width = "100%";

		this.content.addChild(this.links, this.nodes, this.labels);
		this.app.stage.addChild(this.content);
		this.setData(data);
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(container);
		this.themeObserver = new MutationObserver(() => this.updateColors());
		this.themeObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "style"],
		});
		if (document.body) {
			this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
		}
		this.resize();
		this.bind();
		this.tick();
	}

	destroy() {
		cancelAnimationFrame(this.raf);
		this.resizeObserver.disconnect();
		this.themeObserver.disconnect();
		this.unbind();
		this.app.destroy(true, { children: true });
	}

	private setData(data: GraphInput) {
		this.clearLabels();
		this.nodeById.clear();
		this.edges = [];

		const degree = new Map<string, number>();
		for (const node of data.nodes) degree.set(node.id, 0);
		for (const node of data.nodes) {
			for (const target of node.links) {
				if (!degree.has(target)) continue;
				degree.set(node.id, (degree.get(node.id) || 0) + 1);
				degree.set(target, (degree.get(target) || 0) + 1);
			}
		}

		const spread = Math.max(220, Math.sqrt(data.nodes.length) * 80);
		data.nodes.forEach((node, index) => {
			const angle = (index / Math.max(data.nodes.length, 1)) * Math.PI * 2;
			const radius = spread * (0.35 + Math.random() * 0.65);
			const state: NodeState = {
				...node,
				degree: degree.get(node.id) || 0,
				vx: 0,
				vy: 0,
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
			};
			this.nodeById.set(node.id, state);

			const label = new Text(
				node.label,
				new TextStyle({
					align: "center",
					fill: this.colors.text,
					fontFamily: "ui-sans-serif, system-ui, sans-serif",
					fontSize: 12,
					wordWrap: true,
					wordWrapWidth: 260,
				})
			);
			label.anchor.set(0.5, 0);
			this.labelById.set(node.id, label);
			this.labels.addChild(label);
		});

		for (const node of data.nodes) {
			const source = this.nodeById.get(node.id);
			if (!source) continue;
			for (const targetId of node.links) {
				const target = this.nodeById.get(targetId);
				if (target) this.edges.push([source, target]);
			}
		}
	}

	private bind() {
		const view = this.app.view;
		view.addEventListener("pointerdown", this.onPointerDown);
		view.addEventListener("pointermove", this.onPointerMove);
		view.addEventListener("pointerup", this.onPointerUp);
		view.addEventListener("pointercancel", this.onPointerUp);
		view.addEventListener("pointerleave", this.onPointerLeave);
		view.addEventListener("wheel", this.onWheel, { passive: false });
	}

	private unbind() {
		const view = this.app.view;
		view.removeEventListener("pointerdown", this.onPointerDown);
		view.removeEventListener("pointermove", this.onPointerMove);
		view.removeEventListener("pointerup", this.onPointerUp);
		view.removeEventListener("pointercancel", this.onPointerUp);
		view.removeEventListener("pointerleave", this.onPointerLeave);
		view.removeEventListener("wheel", this.onWheel);
	}

	private onPointerDown = (event: PointerEvent) => {
		const point = this.pointerPoint(event);
		const world = this.toWorld(point.x, point.y);
		const node = this.findNode(world.x, world.y);
		if (this.hoveredNode) {
			this.hoveredNode = null;
			this.callbacks?.onNodeLeave?.();
		}

		this.app.view.setPointerCapture(event.pointerId);
		if (node) {
			this.pointer = {
				id: event.pointerId,
				kind: "node",
				moved: false,
				node,
				offsetX: node.x - world.x,
				offsetY: node.y - world.y,
			};
			this.app.view.style.cursor = "grabbing";
			return;
		}

		this.pointer = {
			id: event.pointerId,
			kind: "pan",
			startPanX: this.panX,
			startPanY: this.panY,
			startX: point.x,
			startY: point.y,
		};
		this.app.view.style.cursor = "grabbing";
	};

	private onPointerMove = (event: PointerEvent) => {
		const point = this.pointerPoint(event);

		if (!this.pointer) {
			const world = this.toWorld(point.x, point.y);
			const node = this.findNode(world.x, world.y);
			this.app.view.style.cursor = node ? "grab" : "default";

			// Handle hover — pass pointer position (not node position)
			if (node && this.callbacks?.onNodeHover) {
				const rect = this.app.view.getBoundingClientRect();
				this.callbacks.onNodeHover(node.id, rect.left + point.x, rect.top + point.y);
				if (this.hoveredNode !== node) {
					this.hoveredNode = node;
				}
			} else if (!node && this.hoveredNode && this.callbacks?.onNodeLeave) {
				this.hoveredNode = null;
				this.callbacks.onNodeLeave();
			}
			return;
		}

		if (this.pointer.id !== event.pointerId) return;

		if (this.pointer.kind === "pan") {
			this.panX = this.pointer.startPanX + point.x - this.pointer.startX;
			this.panY = this.pointer.startPanY + point.y - this.pointer.startY;
			return;
		}

		const world = this.toWorld(point.x, point.y);
		const dx = this.pointer.node.x - (world.x + this.pointer.offsetX);
		const dy = this.pointer.node.y - (world.y + this.pointer.offsetY);
		if (dx * dx + dy * dy > 4) this.pointer.moved = true;
		this.pointer.node.x = world.x + this.pointer.offsetX;
		this.pointer.node.y = world.y + this.pointer.offsetY;
		this.pointer.node.vx = 0;
		this.pointer.node.vy = 0;
	};

	private onPointerUp = (event: PointerEvent) => {
		if (this.pointer?.id !== event.pointerId) return;

		if (this.pointer.kind === "node" && !this.pointer.moved) {
			if (this.callbacks?.onNodeClick) {
				this.callbacks.onNodeClick(this.pointer.node.id, this.pointer.node.type);
			} else if (this.pointer.node.href) {
				window.location.assign(this.pointer.node.href);
			}
		}

		this.pointer = null;
		this.app.view.style.cursor = "default";
		try {
			this.app.view.releasePointerCapture(event.pointerId);
		} catch {
			return;
		}
	};

	private onPointerLeave = () => {
		if (this.pointer || !this.hoveredNode) return;
		this.hoveredNode = null;
		this.callbacks?.onNodeLeave?.();
		this.app.view.style.cursor = "default";
	};

	private onWheel = (event: WheelEvent) => {
		event.preventDefault();
		const point = this.pointerPoint(event);
		const before = this.toWorld(point.x, point.y);
		this.targetScale = Math.min(2, Math.max(0.25, this.targetScale * Math.pow(1.0015, -event.deltaY)));
		this.scale += (this.targetScale - this.scale) * 0.9;
		this.panX = point.x - before.x * this.scale;
		this.panY = point.y - before.y * this.scale;
	};

	private tick = () => {
		this.step();
		this.draw();
		this.app.render();
		this.raf = requestAnimationFrame(this.tick);
	};

	private step() {
		const values = [...this.nodeById.values()];

		for (const [source, target] of this.edges) {
			const dx = target.x - source.x || 0.01;
			const dy = target.y - source.y || 0.01;
			const distance = Math.hypot(dx, dy);
			const force = ((distance - 150) / distance) * 0.012;
			const fx = dx * force;
			const fy = dy * force;
			source.vx += fx;
			source.vy += fy;
			target.vx -= fx;
			target.vy -= fy;
		}

		// ponytail: O(n^2) is fine for this graph size; add spatial indexing only after profiling.
		for (let i = 0; i < values.length; i++) {
			for (let j = i + 1; j < values.length; j++) {
				const a = values[i];
				const b = values[j];
				const dx = b.x - a.x || 0.01;
				const dy = b.y - a.y || 0.01;
				const distance2 = dx * dx + dy * dy;
				const distance = Math.sqrt(distance2);
				const force = 950 / distance2;
				const fx = (dx / distance) * force;
				const fy = (dy / distance) * force;
				a.vx -= fx;
				a.vy -= fy;
				b.vx += fx;
				b.vy += fy;
			}
		}

		for (const node of values) {
			if (this.pointer?.kind === "node" && this.pointer.node === node) continue;
			node.vx += -node.x * 0.0007;
			node.vy += -node.y * 0.0007;
			node.x += node.vx;
			node.y += node.vy;
			node.vx *= 0.88;
			node.vy *= 0.88;
		}

		this.scale += (this.targetScale - this.scale) * 0.14;
	}

	private draw() {
		this.content.x = this.panX;
		this.content.y = this.panY;
		this.content.scale.set(this.scale);

		this.links.clear();
		this.links.lineStyle(1.5 / this.scale, this.colors.line, 0.65);
		for (const [source, target] of this.edges) {
			this.links.moveTo(source.x, source.y);
			this.links.lineTo(target.x, target.y);
		}

		this.nodes.clear();
		for (const node of this.nodeById.values()) {
			this.nodes.beginFill(
				node.type === "tag" ? this.colors.tagNode : this.colors.contentNode,
				node.type === "tag" ? 0.95 : 0.82
			);
			this.nodes.drawCircle(node.x, node.y, nodeRadius(node));
			this.nodes.endFill();

			const label = this.labelById.get(node.id);
			if (!label) continue;
			label.x = node.x;
			label.y = node.y + nodeRadius(node) + 5;
			label.scale.set(1 / Math.sqrt(this.scale));
			label.alpha = this.scale > 0.42 || node.degree > 1 ? 1 : 0.35;
		}
	}

	private updateColors() {
		this.colors = readGraphColors(this.container);
		for (const label of this.labelById.values()) {
			label.style = new TextStyle({
				align: "center",
				fill: this.colors.text,
				fontFamily: "ui-sans-serif, system-ui, sans-serif",
				fontSize: 12,
				wordWrap: true,
				wordWrapWidth: 260,
			});
		}
	}

	private resize() {
		const width = this.container.clientWidth;
		const height = this.container.clientHeight;
		this.app.renderer.resize(width, height);
		if (this.panX === 0 && this.panY === 0) {
			this.panX = width / 2;
			this.panY = height / 2;
		}
	}

	private clearLabels() {
		for (const label of this.labelById.values()) label.destroy();
		this.labelById.clear();
		this.labels.removeChildren();
	}

	private findNode(x: number, y: number) {
		let best: { node: NodeState; distance2: number } | null = null;
		for (const node of this.nodeById.values()) {
			const dx = node.x - x;
			const dy = node.y - y;
			const distance2 = dx * dx + dy * dy;
			if (!best || distance2 < best.distance2) best = { node, distance2 };
		}
		return best && best.distance2 <= Math.pow(nodeRadius(best.node) + 4 / this.scale, 2) ? best.node : null;
	}

	private toWorld(x: number, y: number) {
		return {
			x: (x - this.panX) / this.scale,
			y: (y - this.panY) / this.scale,
		};
	}

	private toScreen(x: number, y: number) {
		return {
			x: x * this.scale + this.panX,
			y: y * this.scale + this.panY,
		};
	}

	private pointerPoint(event: PointerEvent | WheelEvent) {
		const rect = this.app.view.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
	}
}

function readGraphColors(element: HTMLElement): GraphColors {
	const style = getComputedStyle(document.documentElement);
	const dark = isDarkTheme(element);

	return {
		contentNode: cssColorToHex(
			style.getPropertyValue(dark ? "--foreground" : "--primary"),
			dark ? 0xf2f2f2 : 0x5f5148
		),
		tagNode: cssColorToHex(
			style.getPropertyValue(dark ? "--primary" : "--secondary-foreground"),
			dark ? 0xf2d791 : 0x5c3f21
		),
		line: cssColorToHex(
			style.getPropertyValue(dark ? "--muted-foreground" : "--border"),
			dark ? 0xc4c4c4 : 0xe0e0e0
		),
		text: cssColorToHex(style.getPropertyValue(dark ? "--muted-foreground" : "--muted"), dark ? 0xff0000 : 0x222222),
	};
}

function isDarkTheme(element: HTMLElement) {
	if (element.closest(".dark") || document.documentElement.classList.contains("dark")) return true;
	if (element.closest(".light") || document.documentElement.classList.contains("light")) return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function cssColorToHex(value: string, fallback: number): number {
	const color = value.trim();
	if (!color) return fallback;

	if (color.startsWith("#")) {
		const hex = color.slice(1);

		if (hex.length === 3) {
			return Number.parseInt(
				hex
					.split("")
					.map((char) => char + char)
					.join(""),
				16
			);
		}

		if (hex.length >= 6) {
			return Number.parseInt(hex.slice(0, 6), 16);
		}
	}

	const rgb = color.match(/^rgba?\(([^)]+)\)$/i);

	if (rgb) {
		const [r, g, b] = rgb[1]
			.split(/[,\s/]+/)
			.filter(Boolean)
			.map((part) => Number.parseFloat(part));

		if ([r, g, b].every(Number.isFinite)) {
			return packRgb(r, g, b);
		}

		return fallback;
	}

	const lab = color.match(/^lab\(([^)]+)\)$/i);

	if (lab) {
		const parts = lab[1].split(/[\s,/]+/).filter(Boolean);

		if (parts.length < 3) return fallback;

		const l = parseLabLightness(parts[0]);
		const a = parseLabAxis(parts[1]);
		const b = parseLabAxis(parts[2]);

		if (![l, a, b].every(Number.isFinite)) {
			return fallback;
		}

		return labToHex(l, a, b);
	}

	const oklch = color.match(/^oklch\(([^)]+)\)$/i);

	if (oklch) {
		const parts = oklch[1].split(/[\s,/]+/).filter(Boolean);

		if (parts.length < 3) return fallback;

		const l = parseCssNumber(parts[0], 1);
		const c = Number.parseFloat(parts[1]);
		const h = parseHue(parts[2]);

		if (![l, c, h].every(Number.isFinite)) {
			return fallback;
		}

		const hueRadians = (h * Math.PI) / 180;
		const a = c * Math.cos(hueRadians);
		const b = c * Math.sin(hueRadians);

		const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
		const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
		const s_ = l - 0.0894841775 * a - 1.291485548 * b;

		const lmsL = l_ ** 3;
		const lmsM = m_ ** 3;
		const lmsS = s_ ** 3;

		const linearR =
			4.0767416621 * lmsL -
			3.3077115913 * lmsM +
			0.2309699292 * lmsS;

		const linearG =
			-1.2684380046 * lmsL +
			2.6097574011 * lmsM -
			0.3413193965 * lmsS;

		const linearB =
			-0.0041960863 * lmsL -
			0.7034186147 * lmsM +
			1.707614701 * lmsS;

		return packRgb(
			toSrgb(linearR) * 255,
			toSrgb(linearG) * 255,
			toSrgb(linearB) * 255
		);
	}

	return fallback;
}

function labToHex(l: number, a: number, b: number): number {
	const fy = (l + 16) / 116;
	const fx = fy + a / 500;
	const fz = fy - b / 200;

	const xD50 = labPivotInverse(fx) * 0.96422;
	const yD50 = labPivotInverse(fy);
	const zD50 = labPivotInverse(fz) * 0.82521;

	// Bradford adaptation: D50 → D65.
	const xD65 =
		0.9555766 * xD50 -
		0.0230393 * yD50 +
		0.0631636 * zD50;

	const yD65 =
		-0.0282895 * xD50 +
		1.0099416 * yD50 +
		0.0210077 * zD50;

	const zD65 =
		0.0122982 * xD50 -
		0.020483 * yD50 +
		1.3299098 * zD50;

	// XYZ D65 → linear sRGB.
	const linearR =
		3.2406 * xD65 -
		1.5372 * yD65 -
		0.4986 * zD65;

	const linearG =
		-0.9689 * xD65 +
		1.8758 * yD65 +
		0.0415 * zD65;

	const linearB =
		0.0557 * xD65 -
		0.204 * yD65 +
		1.057 * zD65;

	return packRgb(
		toSrgb(linearR) * 255,
		toSrgb(linearG) * 255,
		toSrgb(linearB) * 255
	);
}

function labPivotInverse(value: number): number {
	const delta = 6 / 29;

	if (value > delta) {
		return value ** 3;
	}

	return 3 * delta ** 2 * (value - 4 / 29);
}

function parseLabLightness(value: string): number {
	const number = Number.parseFloat(value);

	if (!Number.isFinite(number)) return Number.NaN;

	return clamp(number, 0, 100);
}

function parseLabAxis(value: string): number {
	const number = Number.parseFloat(value);

	if (!Number.isFinite(number)) return Number.NaN;

	return value.endsWith("%") ? (number / 100) * 125 : number;
}

function parseHue(value: string): number {
	const number = Number.parseFloat(value);

	if (!Number.isFinite(number)) return Number.NaN;

	if (value.endsWith("rad")) {
		return (number * 180) / Math.PI;
	}

	if (value.endsWith("turn")) {
		return number * 360;
	}

	if (value.endsWith("grad")) {
		return number * 0.9;
	}

	return number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function parseCssNumber(value: string | undefined, percentBase: number) {
	if (!value) return 0;
	return value.endsWith("%") ? (Number.parseFloat(value) / 100) * percentBase : Number.parseFloat(value);
}

function toSrgb(value: number) {
	const clamped = Math.min(1, Math.max(0, value));
	return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function packRgb(r: number, g: number, b: number) {
	return (clampByte(r) << 16) + (clampByte(g) << 8) + clampByte(b);
}

function clampByte(value: number) {
	return Math.max(0, Math.min(255, Math.round(Number.isFinite(value) ? value : 0)));
}
