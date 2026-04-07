import type { TouchEvent } from "react";
import { useRef } from "react";

interface SwipeConfig {
	direction: "horizontal" | "vertical" | "down" | "up" | "left" | "right";
	threshold?: number;
	onSwipe?: () => void;
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	onSwipeUp?: () => void;
	onSwipeDown?: () => void;
}

interface UseModalGesturesOptions {
	enabled?: boolean;
	swipe?: SwipeConfig;
}

interface GestureHandlers {
	onTouchStart: (e: TouchEvent) => void;
	onTouchMove: (e: TouchEvent) => void;
	onTouchEnd: () => void;
}

function isInteractiveTarget(target: EventTarget | null) {
	if (!(target instanceof Element)) {
		return false;
	}

	return Boolean(target.closest("a, button, input, select, textarea, video, [role='button'], [role='switch'], [data-no-swipe='true']"));
}

export function useModalGestures({ enabled = true, swipe }: UseModalGesturesOptions = {}): GestureHandlers {
	const touchStartRef = useRef<{ x: number; y: number } | null>(null);
	const touchEndRef = useRef<{ x: number; y: number } | null>(null);
	const lockedAxisRef = useRef<"horizontal" | "vertical" | null>(null);
	const ignoreGestureRef = useRef(false);

	const handleTouchStart = (e: TouchEvent) => {
		if (!enabled || !swipe) return;

		ignoreGestureRef.current = isInteractiveTarget(e.target);
		lockedAxisRef.current = null;
		touchEndRef.current = null;

		if (ignoreGestureRef.current) {
			touchStartRef.current = null;
			return;
		}

		touchStartRef.current = {
			x: e.targetTouches[0].clientX,
			y: e.targetTouches[0].clientY,
		};
	};

	const handleTouchMove = (e: TouchEvent) => {
		if (!enabled || !swipe || ignoreGestureRef.current || !touchStartRef.current) return;

		touchEndRef.current = {
			x: e.targetTouches[0].clientX,
			y: e.targetTouches[0].clientY,
		};

		const deltaX = Math.abs(touchStartRef.current.x - touchEndRef.current.x);
		const deltaY = Math.abs(touchStartRef.current.y - touchEndRef.current.y);

		if (!lockedAxisRef.current && (deltaX > 8 || deltaY > 8)) {
			lockedAxisRef.current = deltaX > deltaY ? "horizontal" : "vertical";
		}

		if (lockedAxisRef.current === "horizontal") {
			e.preventDefault();
		}
	};

	const handleTouchEnd = () => {
		const touchStart = touchStartRef.current;
		const touchEnd = touchEndRef.current;

		if (!enabled || !swipe || ignoreGestureRef.current || !touchStart || !touchEnd) {
			touchStartRef.current = null;
			touchEndRef.current = null;
			lockedAxisRef.current = null;
			ignoreGestureRef.current = false;
			return;
		}

		const threshold = swipe.threshold || 50;
		const deltaX = touchStart.x - touchEnd.x;
		const deltaY = touchStart.y - touchEnd.y;

		const isLeftSwipe = deltaX > threshold;
		const isRightSwipe = deltaX < -threshold;
		const isUpSwipe = deltaY > threshold;
		const isDownSwipe = deltaY < -threshold;

		const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
		const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);

		if (swipe.direction === "horizontal" && isHorizontalSwipe) {
			if (isLeftSwipe && swipe.onSwipeLeft) swipe.onSwipeLeft();
			else if (isRightSwipe && swipe.onSwipeRight) swipe.onSwipeRight();

			swipe.onSwipe?.();
		}

		if (swipe.direction === "vertical" && isVerticalSwipe) {
			if (isUpSwipe && swipe.onSwipeUp) swipe.onSwipeUp();
			else if (isDownSwipe && swipe.onSwipeDown) swipe.onSwipeDown();

			swipe.onSwipe?.();
		}

		if (swipe.direction === "down" && isDownSwipe && isVerticalSwipe) {
			swipe.onSwipeDown?.();
			swipe.onSwipe?.();
		}

		if (swipe.direction === "up" && isUpSwipe && isVerticalSwipe) {
			swipe.onSwipeUp?.();
			swipe.onSwipe?.();
		}

		if (swipe.direction === "left" && isLeftSwipe && isHorizontalSwipe) {
			swipe.onSwipeLeft?.();
			swipe.onSwipe?.();
		}

		if (swipe.direction === "right" && isRightSwipe && isHorizontalSwipe) {
			swipe.onSwipeRight?.();
			swipe.onSwipe?.();
		}

		touchStartRef.current = null;
		touchEndRef.current = null;
		lockedAxisRef.current = null;
		ignoreGestureRef.current = false;
	};

	return {
		onTouchStart: handleTouchStart,
		onTouchMove: handleTouchMove,
		onTouchEnd: handleTouchEnd,
	};
}
