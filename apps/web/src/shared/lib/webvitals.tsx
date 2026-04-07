"use client";

import { useReportWebVitals } from "next/web-vitals";

function sendToAnalytics(_metric: unknown) {}

export function WebVitals() {
	useReportWebVitals(sendToAnalytics);
	return null;
}
