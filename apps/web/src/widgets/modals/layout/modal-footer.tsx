"use client";

import { cn } from "@synapse/ui/cn";
import type { ReactNode } from "react";

import { modalSpacing } from "@/shared/ui/design-tokens";

interface ModalFooterProps {
	children: ReactNode;
	className?: string;
	sticky?: boolean;
	bordered?: boolean;
}

export function ModalFooter({ children, className, sticky = true, bordered = true }: ModalFooterProps) {
	return (
		<div
			className={cn(
				"flex-shrink-0 bg-background",
				sticky && "sticky bottom-0 z-20",
				bordered && "border-t border-border",
				className
			)}
			style={{ padding: modalSpacing.footerPadding.desktop }}>
			{children}
		</div>
	);
}
