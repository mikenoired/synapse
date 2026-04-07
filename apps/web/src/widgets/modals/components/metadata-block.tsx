"use client";

import { cn } from "@synapse/ui/cn";
import type { LucideIcon } from "lucide-react";
import { Calendar, Clock } from "lucide-react";

import { modalTypography } from "@/shared/ui/design-tokens";

interface MetadataItem {
	icon: LucideIcon;
	label: string;
	value: string;
}

interface MetadataBlockProps {
	createdAt?: string;
	updatedAt?: string;
	readingTime?: string;
	customItems?: MetadataItem[];
	className?: string;
}

export function MetadataBlock({
	createdAt,
	updatedAt,
	readingTime,
	customItems = [],
	className,
}: MetadataBlockProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("ru-RU", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const items: MetadataItem[] = [];

	if (createdAt) {
		items.push({
			icon: Calendar,
			label: "Создано",
			value: formatDate(createdAt),
		});
	}

	if (updatedAt && createdAt !== updatedAt) {
		items.push({
			icon: Clock,
			label: "Обновлено",
			value: formatDate(updatedAt),
		});
	}

	if (readingTime) {
		items.push({
			icon: Clock,
			label: "Время чтения",
			value: readingTime,
		});
	}

	items.push(...customItems);

	if (items.length === 0) return null;

	return (
		<div className={cn("flex flex-wrap items-center gap-4", modalTypography.caption, className)}>
			{items.map((item, index) => (
				<div key={index} className="flex items-center gap-1.5">
					<item.icon className="w-3 h-3" />
					<span>
						{item.label && `${item.label}: `}
						{item.value}
					</span>
				</div>
			))}
		</div>
	);
}
