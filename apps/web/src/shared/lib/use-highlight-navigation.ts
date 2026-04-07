"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface HighlightFrame {
	top: number;
	left: number;
	width: number;
	height: number;
}

function getRelativeFrame(element: HTMLElement, container: HTMLElement): HighlightFrame {
	const elementRect = element.getBoundingClientRect();
	const containerRect = container.getBoundingClientRect();

	return {
		top: elementRect.top - containerRect.top,
		left: elementRect.left - containerRect.left,
		width: elementRect.width,
		height: elementRect.height,
	};
}

function getFrames(keys: string[], itemRefs: Map<string, HTMLElement>, container: HTMLElement) {
	return keys.reduce<Record<string, HighlightFrame>>((result, key) => {
		const element = itemRefs.get(key);

		if (element) {
			result[key] = getRelativeFrame(element, container);
		}

		return result;
	}, {});
}

function areFramesEqual(
	currentFrames: Record<string, HighlightFrame>,
	nextFrames: Record<string, HighlightFrame>,
	keys: string[]
) {
	if (Object.keys(currentFrames).length !== Object.keys(nextFrames).length) {
		return false;
	}

	return keys.every((key) => {
		const currentFrame = currentFrames[key];
		const nextFrame = nextFrames[key];

		if (!currentFrame && !nextFrame) {
			return true;
		}

		if (!currentFrame || !nextFrame) {
			return false;
		}

		return (
			currentFrame.top === nextFrame.top &&
			currentFrame.left === nextFrame.left &&
			currentFrame.width === nextFrame.width &&
			currentFrame.height === nextFrame.height
		);
	});
}

export function useHighlightNavigation(keys: string[], activeKey?: string) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const itemRefs = useRef(new Map<string, HTMLElement>());
	const [frames, setFrames] = useState<Record<string, HighlightFrame>>({});
	const keysSignature = useMemo(() => keys.join("|"), [keys]);

	const measure = useCallback(() => {
		const container = containerRef.current;

		if (!container) {
			return;
		}

		const nextFrames = getFrames(keys, itemRefs.current, container);

		setFrames((currentFrames) => {
			if (areFramesEqual(currentFrames, nextFrames, keys)) {
				return currentFrames;
			}

			return nextFrames;
		});
	}, [keys, keysSignature]);

	useEffect(() => {
		measure();

		const observer = new ResizeObserver(() => measure());
		const container = containerRef.current;

		if (container) {
			observer.observe(container);
		}

		itemRefs.current.forEach((element) => observer.observe(element));
		window.addEventListener("resize", measure);

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [measure]);

	useEffect(() => {
		measure();
	}, [activeKey, measure]);

	const registerItem = useCallback(
		(key: string) => {
			return (element: HTMLElement | null) => {
				if (element) {
					itemRefs.current.set(key, element);
					requestAnimationFrame(measure);
					return;
				}

				itemRefs.current.delete(key);
			};
		},
		[measure]
	);

	const activeFrame = useMemo(() => {
		if (!activeKey) {
			return null;
		}

		return frames[activeKey] ?? null;
	}, [activeKey, frames]);

	return {
		containerRef,
		registerItem,
		frames,
		activeFrame,
	};
}

export function getHighlightClipPath(itemFrame?: HighlightFrame, activeFrame?: HighlightFrame | null) {
	if (!itemFrame || !activeFrame) {
		return "inset(50% round 999px)";
	}

	const overlapLeft = Math.max(itemFrame.left, activeFrame.left);
	const overlapTop = Math.max(itemFrame.top, activeFrame.top);
	const overlapRight = Math.min(itemFrame.left + itemFrame.width, activeFrame.left + activeFrame.width);
	const overlapBottom = Math.min(itemFrame.top + itemFrame.height, activeFrame.top + activeFrame.height);

	if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
		return "inset(50% round 999px)";
	}

	const top = overlapTop - itemFrame.top;
	const right = itemFrame.left + itemFrame.width - overlapRight;
	const bottom = itemFrame.top + itemFrame.height - overlapBottom;
	const left = overlapLeft - itemFrame.left;

	return `inset(${top}px ${right}px ${bottom}px ${left}px round 999px)`;
}
