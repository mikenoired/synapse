"use client";

import { Skeleton } from "@synapse/ui/components";
import { CalendarDays, Mail } from "lucide-react";

import { trpc } from "@/shared/api/trpc";

function formatRegistrationDate(date?: string | Date | null) {
	if (!date) return "Дата недоступна";

	return `С нами с ${new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(date))}`;
}

export default function GeneralTab() {
	const { data: user, isLoading } = trpc.user.getUser.useQuery();

	if (isLoading) {
		return (
			<div className="space-y-4 py-1">
				<Skeleton className="h-14 w-full rounded-2xl" />
				<Skeleton className="h-10 w-52 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-full max-w-md" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-5 py-1">
			<div className="flex flex-wrap gap-3">
				<div className="inline-flex items-center gap-3 rounded-full bg-muted px-3 py-2 text-sm text-foreground align-middle">
					<Mail className="size-4" />
					<span className="truncate text-sm font-medium text-foreground">{user?.email}</span>
				</div>

				<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm text-foreground">
					<CalendarDays className="size-4 text-muted-foreground" />
					<span>{formatRegistrationDate(user?.createdAt)}</span>
				</div>
			</div>
		</div>
	);
}
