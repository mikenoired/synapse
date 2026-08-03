"use client";

import { cn } from "@synapse/ui/cn";
import { Badge } from "@synapse/ui/components";
import { X } from "lucide-react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

import { api } from "@/shared/api/hooks";
import { getTagColorStyle } from "@/shared/lib/tag-colors";
import Link from "@/shared/router/link";

type BadgeProps = React.ComponentProps<typeof Badge>;

interface ContentTagProps {
	tag: string;
	tagId?: string;
	variant?: BadgeProps["variant"];
	className?: string;
	onRemove?: (tag: string) => void;
	disabled?: boolean;
	children?: ReactNode;
	color?: number;
	style?: CSSProperties;
}

export function ContentTag({
	tag,
	tagId,
	variant = "solid",
	className,
	onRemove,
	disabled = false,
	children,
	color,
	style,
}: ContentTagProps) {
	const stop = (event: MouseEvent) => event.stopPropagation();
	const { data: knownTags = [] } = api.content.getTags.useQuery(undefined, {
		enabled: color === undefined,
		refetchOnMount: true,
		staleTime: 30_000,
	});
	const normalizedTitle = tag.trim().toLowerCase();
	const knownTag = knownTags.find(
		(candidate) => candidate.id === tagId || candidate.title.trim().toLowerCase() === normalizedTitle
	);
	const resolvedColor = color ?? knownTag?.color ?? 0;
	const colorStyle = getTagColorStyle(resolvedColor);
	const badgeStyle = { ...colorStyle, ...style };
	const colorDot = resolvedColor > 0 && (
		<span className="size-1.5 shrink-0 rounded-full bg-[var(--tag-color)]" aria-hidden="true" />
	);

	if (onRemove) {
		return (
			<Badge variant={variant} className={cn("flex items-center gap-1", className)} style={badgeStyle}>
				{colorDot}
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
			<Badge variant={variant} className={cn("cursor-pointer", className)} style={badgeStyle}>
				<Link href={`/dashboard/tag/${tagId}`} onClick={stop}>
					{colorDot}
					{children ?? tag}
				</Link>
			</Badge>
		);
	}

	return (
		<Badge variant={variant} className={className} style={badgeStyle}>
			{colorDot}
			{children ?? tag}
		</Badge>
	);
}
