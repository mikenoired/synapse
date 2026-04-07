"use client";

import { CustomScrollbar } from "@synapse/ui/components";
import type { ReactNode } from "react";
import { useRef } from "react";

import DashboardContent from "./dashboard-content";

export default function DashboardWrapper({ children }: { children: ReactNode }) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	return (
		<div className="relative flex-1 min-h-0">
			<DashboardContent scrollContainerRef={scrollContainerRef}>{children}</DashboardContent>
			<CustomScrollbar scrollContainerRef={scrollContainerRef} />
		</div>
	);
}
