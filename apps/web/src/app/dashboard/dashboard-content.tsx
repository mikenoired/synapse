import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface DashboardContentProps {
	children: ReactNode;
}

export default function DashboardContent({ children }: DashboardContentProps) {
	return (
		<motion.main className="h-screen min-h-0 min-w-0 flex-1 p-4 pl-0">
			<div
				className="h-full w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-lg bg-muted/50 pb-20 shadow-sm sm:pb-0 dark:bg-background"
				style={{ maxHeight: "100vh", height: "100%" }}>
				{children}
			</div>
		</motion.main>
	);
}
