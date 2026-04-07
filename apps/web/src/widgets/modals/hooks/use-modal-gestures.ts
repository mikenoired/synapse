import type { TouchEvent } from "react";
import { useState } from "react";

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

export function useModalGestures({ enabled = true, swipe }: UseModalGesturesOptions = {}): GestureHandlers {
	const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
	const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

	const handleTouchStart = (e: TouchEvent) => {
		if (!enabled || !swipe) return;

		setTouchEnd(null);
		setTouchStart({
			x: e.targetTouches[0].clientX,
			y: e.targetTouches[0].clientY,
		});
	};

	const handleTouchMove = (e: TouchEvent) => {
		if (!enabled || !swipe) return;

		setTouchEnd({
			x: e.targetTouches[0].clientX,
			y: e.targetTouches[0].clientY,
		});
	};

	const handleTouchEnd = () => {
		if (!enabled || !swipe || !touchStart || !touchEnd) return;

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

		setTouchStart(null);
		setTouchEnd(null);
	};

	return {
		onTouchStart: handleTouchStart,
		onTouchMove: handleTouchMove,
		onTouchEnd: handleTouchEnd,
	};
}
