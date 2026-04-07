"use client";

import { useEffect } from "react";

export function PerformanceMonitor() {
	return null;
}

export function measureRenderTime(_componentName: string) {
	return () => {};
}

export function useMountTime(componentName: string) {
	useEffect(() => {
		return measureRenderTime(componentName);
	}, [componentName]);
}
