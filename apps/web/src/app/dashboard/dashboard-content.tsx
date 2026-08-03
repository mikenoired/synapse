"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface DashboardContentProps {
	children: ReactNode;
}

export default function DashboardContent({ children }: DashboardContentProps) {
	return (
		<motion.main className="flex-1 min-w-0 h-screen min-h-0 p-4 pl-0">
			<div
				className="w-full min-w-0 pb-20 sm:pb-0 overflow-y-auto overflow-x-hidden flex-1 rounded-lg shadow-sm h-full bg-background"
				style={{ maxHeight: "100vh", height: "100%" }}>
				{children}
			</div>
		</motion.main>
	);
}
