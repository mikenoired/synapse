import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { spring } from "./springs";
import type { ItemRect } from "./use-proximity-hover";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const mergeSpring = spring.moderate;
const cornerDelay = 0.07;
const convergeMs = (mergeSpring.duration + cornerDelay) * 1000 + 80;
const splitMs = mergeSpring.duration * 1000 + 80;

type Rect = { top: number; left: number; width: number; height: number };
export type CheckboxRun = { start: number; end: number; id: number };

export interface SelBlock extends Rect {
	key: string;
	radii: [number, number, number, number];
	instant: boolean;
	exitInstant: boolean;
	delayCorners: boolean;
	cornerDelay?: number;
	opacity?: number;
	enterFrom?: { top: number; height: number; radii: [number, number, number, number] };
}

interface Boundary {
	tid: number;
	kind: "merge" | "split";
	survivorId: number;
	otherId: number;
	gapIndex: number;
	phase: "converge" | "commit" | "splitIn" | "diverge";
}

function bridgePair(outer: CheckboxRun, runs: CheckboxRun[]) {
	const inside = runs
		.filter((run) => run.start >= outer.start && run.end <= outer.end)
		.sort((left, right) => left.start - right.start);
	if (inside.length !== 2) return null;
	const [upper, lower] = inside;
	return lower.start === upper.end + 2 ? { upper, lower, gap: upper.end + 1 } : null;
}

/**
 * Produces selection blocks with the same merge/split boundary phases as
 * Fluid Functionalism. A bridge row makes two selected runs converge at its
 * centre; unchecking the bridge performs the inverse split.
 */
export function useMergeSplitBlocks(runs: CheckboxRun[], itemRects: ItemRect[], radius: number): SelBlock[] {
	const [boundaries, setBoundaries] = useState<Boundary[]>([]);
	const previousRuns = useRef<CheckboxRun[]>([]);
	const transactionId = useRef(0);
	const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
	const signature = runs.map((run) => `${run.id}:${run.start}-${run.end}`).join("|");

	useIsoLayoutEffect(() => {
		const previous = previousRuns.current;
		const found: Boundary[] = [];

		for (const current of runs) {
			const pair = bridgePair(current, previous);
			if (pair && (current.id === pair.upper.id || current.id === pair.lower.id)) {
				found.push({
					tid: ++transactionId.current,
					kind: "merge",
					survivorId: current.id,
					otherId: current.id === pair.upper.id ? pair.lower.id : pair.upper.id,
					gapIndex: pair.gap,
					phase: "converge",
				});
			}
		}

		for (const previousRun of previous) {
			const pair = bridgePair(previousRun, runs);
			if (pair) {
				found.push({
					tid: ++transactionId.current,
					kind: "split",
					survivorId: pair.upper.id,
					otherId: pair.lower.id,
					gapIndex: pair.gap,
					phase: "splitIn",
				});
			}
		}

		previousRuns.current = runs.map((run) => ({ ...run }));
		const isValid = (boundary: Boundary) =>
			boundary.kind === "merge"
				? runs.some(
						(run) =>
							run.id === boundary.survivorId && boundary.gapIndex > run.start && boundary.gapIndex < run.end
					)
				: runs.some((run) => run.id === boundary.survivorId && run.end === boundary.gapIndex - 1) &&
					runs.some((run) => run.id === boundary.otherId && run.start === boundary.gapIndex + 1);

		for (const boundary of found) {
			timers.current.set(
				boundary.tid,
				setTimeout(
					() => {
						timers.current.delete(boundary.tid);
						setBoundaries((active) =>
							active.flatMap((item) =>
								item.tid !== boundary.tid
									? [item]
									: item.kind === "merge"
										? [{ ...item, phase: "commit" as const }]
										: []
							)
						);
					},
					boundary.kind === "merge" ? convergeMs : splitMs
				)
			);
		}

		setBoundaries((active) => {
			active.forEach((boundary) => {
				if (isValid(boundary)) return;
				const timer = timers.current.get(boundary.tid);
				if (timer) clearTimeout(timer);
				timers.current.delete(boundary.tid);
			});
			return [...active.filter(isValid), ...found];
		});
	}, [signature]);

	useEffect(() => () => timers.current.forEach(clearTimeout), []);

	useEffect(() => {
		if (!boundaries.some((boundary) => boundary.phase === "splitIn" || boundary.phase === "commit")) return;
		setBoundaries((active) =>
			active.flatMap((boundary) =>
				boundary.phase === "commit"
					? []
					: [{ ...boundary, phase: boundary.phase === "splitIn" ? "diverge" : boundary.phase }]
			)
		);
	}, [boundaries]);

	const rectOf = (start: number, end: number): Rect | null => {
		const first = itemRects[start];
		const last = itemRects[end];
		if (!first || !last) return null;
		return {
			top: first.top,
			left: Math.min(first.left, last.left),
			width: Math.max(first.width, last.width),
			height: last.top + last.height - first.top,
		};
	};

	const blocks: SelBlock[] = runs.flatMap((run): SelBlock[] => {
		const rect = rectOf(run.start, run.end);
		return rect
			? [
					{
						key: `selection-${run.id}`,
						...rect,
						radii: [radius, radius, radius, radius] as [number, number, number, number],
						instant: false,
						exitInstant: false,
						delayCorners: false,
					},
				]
			: [];
	});
	const byId = new Map(blocks.map((block) => [block.key, block]));

	for (const boundary of boundaries) {
		const gap = itemRects[boundary.gapIndex];
		const survivor = byId.get(`selection-${boundary.survivorId}`);
		if (!gap || !survivor) continue;
		const midpoint = gap.top + gap.height / 2;

		if (boundary.kind === "merge") {
			if (boundary.phase === "commit") {
				survivor.instant = true;
				blocks.push({
					key: `selection-${boundary.otherId}`,
					top: midpoint,
					left: survivor.left,
					width: survivor.width,
					height: survivor.top + survivor.height - midpoint,
					radii: [0, 0, radius, radius],
					instant: true,
					exitInstant: true,
					delayCorners: false,
					opacity: 0,
				});
				continue;
			}

			const bottom = survivor.top + survivor.height;
			survivor.height = midpoint - survivor.top;
			survivor.radii = [radius, radius, 0, 0];
			survivor.delayCorners = true;
			blocks.push({
				key: `selection-${boundary.otherId}`,
				top: midpoint,
				left: survivor.left,
				width: survivor.width,
				height: bottom - midpoint,
				radii: [0, 0, radius, radius],
				instant: false,
				exitInstant: true,
				delayCorners: true,
				enterFrom: { top: midpoint, height: bottom - midpoint, radii: [radius, radius, radius, radius] },
			});
		} else if (boundary.phase === "splitIn") {
			const lower = byId.get(`selection-${boundary.otherId}`);
			if (!lower) continue;
			const bottom = lower.top + lower.height;
			survivor.height = midpoint - survivor.top;
			survivor.radii = [radius, radius, 0, 0];
			survivor.instant = true;
			lower.top = midpoint;
			lower.height = bottom - midpoint;
			lower.radii = [0, 0, radius, radius];
			lower.instant = true;
			lower.enterFrom = { top: midpoint, height: bottom - midpoint, radii: [0, 0, radius, radius] };
		}
	}

	// The split boundary is registered in a layout effect. On the first render
	// after a split, pin both halves at the seam so the lower block never mounts
	// at its final position for a frame before the divergence spring begins.
	for (const previous of previousRuns.current) {
		const pair = bridgePair(previous, runs);
		const gap = pair && itemRects[pair.gap];
		if (!pair || !gap) continue;

		const upper = byId.get(`selection-${pair.upper.id}`);
		const lower = byId.get(`selection-${pair.lower.id}`);
		if (!upper || !lower) continue;

		const midpoint = gap.top + gap.height / 2;
		const bottom = lower.top + lower.height;
		upper.height = midpoint - upper.top;
		upper.radii = [radius, radius, 0, 0];
		upper.instant = true;
		lower.top = midpoint;
		lower.height = bottom - midpoint;
		lower.radii = [0, 0, radius, radius];
		lower.instant = true;
		lower.enterFrom = { top: midpoint, height: bottom - midpoint, radii: [0, 0, radius, radius] };
	}

	return blocks;
}

export function SelectionBackgrounds({ blocks }: { blocks: SelBlock[] }) {
	return (
		<AnimatePresence>
			{blocks.map((block) => {
				const cornerSpring = block.delayCorners
					? { ...mergeSpring, delay: block.cornerDelay ?? cornerDelay }
					: mergeSpring;
				const opacity = block.opacity ?? 1;
				return (
					<motion.div
						aria-hidden="true"
						className="pointer-events-none absolute bg-muted/70"
						exit={{ opacity: 0, transition: block.exitInstant ? { duration: 0 } : mergeSpring.exit }}
						initial={
							block.enterFrom
								? {
										opacity,
										top: block.enterFrom.top,
										left: block.left,
										width: block.width,
										height: block.enterFrom.height,
										borderRadius: block.enterFrom.radii,
									}
								: false
						}
						key={block.key}
						animate={{
							top: block.top,
							left: block.left,
							width: block.width,
							height: block.height,
							borderTopLeftRadius: block.radii[0],
							borderTopRightRadius: block.radii[1],
							borderBottomRightRadius: block.radii[2],
							borderBottomLeftRadius: block.radii[3],
							opacity,
						}}
						transition={{
							...(block.instant ? { duration: 0 } : mergeSpring),
							borderTopLeftRadius: cornerSpring,
							borderTopRightRadius: cornerSpring,
							borderBottomRightRadius: cornerSpring,
							borderBottomLeftRadius: cornerSpring,
							opacity: { duration: 0.08 },
						}}
					/>
				);
			})}
		</AnimatePresence>
	);
}
