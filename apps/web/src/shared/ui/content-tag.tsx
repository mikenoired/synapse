"use client";

import { cn } from "@synapse/ui/cn";
import { Badge } from "@synapse/ui/components";
import { X } from "lucide-react";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

type BadgeProps = React.ComponentProps<typeof Badge>;

interface ContentTagProps {
	tag: string;
	tagId?: string;
	variant?: BadgeProps["variant"];
	className?: string;
	onRemove?: (tag: string) => void;
	disabled?: boolean;
	children?: ReactNode;
}

export function ContentTag({
	tag,
	tagId,
	variant = "secondary",
	className,
	onRemove,
	disabled = false,
	children,
}: ContentTagProps) {
	const stop = (event: MouseEvent) => event.stopPropagation();

	if (onRemove) {
		return (
			<Badge variant={variant} className={cn("flex items-center gap-1", className)}>
				{children ?? tag}
				<button
					type="button"
					onClick={(event) => {
						stop(event);
						onRemove(tag);
					}}
					className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
					disabled={disabled}
					aria-label={`Удалить тег ${tag}`}>
					<X className="w-3 h-3" />
				</button>
			</Badge>
		);
	}

	if (tagId) {
		return (
			<Badge asChild variant={variant} className={cn("cursor-pointer", className)}>
				<Link href={`/dashboard/tag/${tagId}`} onClick={stop}>
					{children ?? tag}
				</Link>
			</Badge>
		);
	}

	return (
		<Badge variant={variant} className={className}>
			{children ?? tag}
		</Badge>
	);
}
