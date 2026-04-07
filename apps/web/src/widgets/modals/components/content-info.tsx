"use client";

import { cn } from "@synapse/ui/cn";
import type { LucideIcon } from "lucide-react";

interface ContentInfoProps {
	icon: LucideIcon;
	type: string;
	className?: string;
}

export function ContentInfo({ icon: Icon, type, className }: ContentInfoProps) {
	return (
		<div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
			<Icon className="size-4" />
			<span className="leading-none">{type}</span>
		</div>
	);
}
