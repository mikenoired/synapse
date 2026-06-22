"use client";

import { Button, Skeleton } from "@synapse/ui/components";
import { CalendarDays, LogOut, Mail } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/shared/api/trpc";
import { useAuth } from "@/shared/lib/auth-context";

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
	const { signOut } = useAuth();
	const [isSigningOut, setIsSigningOut] = useState(false);

	const handleSignOut = async () => {
		setIsSigningOut(true);
		await signOut();
	};

	if (isLoading) {
		return (
			<div className="space-y-4 py-1">
				<Skeleton className="h-14 w-full rounded-2xl" />
				<Skeleton className="h-10 w-52 rounded-full" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-full max-w-md" />
				</div>

				<Skeleton className="h-[76px] w-full rounded-3xl" />
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

			<div className="flex items-center justify-between gap-4 rounded-3xl bg-muted px-5 py-4">
				<div>
					<h2 className="text-sm font-medium">Текущая сессия</h2>
					<p className="mt-1 text-sm text-muted-foreground">Завершить работу на этом устройстве.</p>
				</div>
				<Button
					variant="destructive"
					className="h-11 shrink-0"
					disabled={isSigningOut}
					onClick={handleSignOut}>
					<LogOut className="size-4" />
					{isSigningOut ? "Выходим…" : "Выйти"}
				</Button>
			</div>
		</div>
	);
}
