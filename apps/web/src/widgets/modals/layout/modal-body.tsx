"use client";

import { cn } from "@synapse/ui/cn";
import type { ReactNode } from "react";

import { modalSpacing } from "@/shared/ui/design-tokens";

interface ModalBodyProps {
	children: ReactNode;
	className?: string;
	scrollable?: boolean;
	noPadding?: boolean;
}

export function ModalBody({ children, className, scrollable = true, noPadding = false }: ModalBodyProps) {
	return (
		<div
			className={cn(
				"flex-1",
				scrollable && "overflow-y-auto overflow-x-hidden",
				!noPadding && "p-6",
				className
			)}
			style={!noPadding ? { padding: modalSpacing.contentPadding.desktop } : undefined}>
			{children}
		</div>
	);
}
