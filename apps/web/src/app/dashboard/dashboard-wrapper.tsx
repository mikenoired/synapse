"use client";

import type { ReactNode } from "react";

import DashboardContent from "./dashboard-content";

export default function DashboardWrapper({ children }: { children: ReactNode }) {
	return (
		<div className="relative min-w-0 flex-1 min-h-0">
			<DashboardContent>{children}</DashboardContent>
		</div>
	);
}
