"use client";

import { useEffect, useRef } from "react";

interface UseInfiniteScrollOptions {
	enabled?: boolean;
	onLoadMore?: () => void;
	root?: Element | null;
	rootMargin?: string;
}

export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
	enabled = true,
	onLoadMore,
	root = null,
	rootMargin = "240px 0px",
}: UseInfiniteScrollOptions) {
	const sentinelRef = useRef<T | null>(null);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || !enabled || !onLoadMore) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) onLoadMore();
			},
			{ root, rootMargin, threshold: 0.01 }
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [enabled, onLoadMore, root, rootMargin]);

	return sentinelRef;
}
