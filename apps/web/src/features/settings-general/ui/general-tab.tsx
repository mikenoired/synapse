import { Button, Skeleton } from "@synapse/ui/components";
import { CalendarDays, LogOutIcon, Mail } from "lucide-react";
import { useState } from "react";

import { api } from "@/shared/api/hooks";
import { useAuth } from "@/shared/lib/auth-context";
import { useI18n } from "@/shared/lib/i18n";

function formatRegistrationDate(
	date: string | Date | null | undefined,
	locale: string,
	template: (date: string) => string,
	noDateLabel: string
) {
	if (!date) return noDateLabel;

	const formattedDate = new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(date));

	return template(formattedDate);
}

export default function GeneralTab() {
	const { data: user, isLoading } = api.user.getUser.useQuery();
	const { signOut } = useAuth();
	const { locale, t } = useI18n();
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
				<div className="inline-flex items-center gap-3 rounded-full bg-muted px-3 py-2 align-middle text-sm text-foreground">
					<Mail className="size-4" />
					<span className="truncate text-sm font-medium text-foreground">{user?.email}</span>
				</div>

				<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-2 text-sm text-foreground">
					<CalendarDays className="size-4 text-muted-foreground" />
					<span>
						{formatRegistrationDate(
							user?.createdAt,
							locale,
							(date) => t("createdWithUs", { date }),
							t("noDate")
						)}
					</span>
				</div>
			</div>

			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 className="text-sm font-medium">{t("session.title")}</h2>
					<p className="mt-1 text-sm text-muted-foreground">{t("session.description")}</p>
				</div>
				<Button variant="primary" leadingIcon={LogOutIcon} disabled={isSigningOut} onClick={handleSignOut}>
					{isSigningOut ? t("session.signingOut") : t("session.signOut")}
				</Button>
			</div>
		</div>
	);
}
