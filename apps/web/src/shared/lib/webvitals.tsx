"use client";

import { useReportWebVitals } from "@/shared/router/web-vitals";

function sendToAnalytics(_metric: unknown) {}

export function WebVitals() {
	useReportWebVitals(sendToAnalytics);
	return null;
}
