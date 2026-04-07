"use client";

import { cn } from "@synapse/ui/cn";
import { Button } from "@synapse/ui/components";
import type { LucideIcon } from "lucide-react";

export interface ActionBarItem {
	icon: LucideIcon;
	label: string;
	onClick: () => void;
	variant?: "default" | "destructive" | "ghost" | "outline";
	disabled?: boolean;
	loading?: boolean;
}

interface ActionBarProps {
	actions: ActionBarItem[];
	className?: string;
	orientation?: "horizontal" | "vertical";
}

export function ActionBar({ actions, className, orientation = "horizontal" }: ActionBarProps) {
	return (
		<div className={cn("flex gap-2", orientation === "vertical" && "flex-col", className)}>
			{actions.map((action, index) => (
				<Button
					key={index}
					variant={action.variant || "outline"}
					size="sm"
					onClick={action.onClick}
					disabled={action.disabled || action.loading}
					className="flex items-center gap-2">
					<action.icon className="w-4 h-4" />
					<span>{action.loading ? "Загрузка..." : action.label}</span>
				</Button>
			))}
		</div>
	);
}
