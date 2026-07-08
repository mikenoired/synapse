"use client";

import { cn } from "@synapse/ui/cn";
import { HardDrive, Languages, PlayCircle } from "lucide-react";

import { trpc } from "@/shared/api/trpc";
import { useI18n } from "@/shared/lib/i18n";
import type { InterfaceLanguage } from "@/shared/lib/user-preferences";
import { useUserPreferences } from "@/shared/lib/user-preferences-context";
import { formatSize } from "@/shared/lib/utils";

function StorageMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium text-foreground">{value}</span>
		</div>
	);
}

function LanguagePreference() {
	const { interfaceLanguage, isReady, setInterfaceLanguage } = useUserPreferences();
	const { t } = useI18n();
	const languageOptions: { label: string; value: InterfaceLanguage }[] = [
		{ label: t("language.russian"), value: "ru" },
		{ label: t("language.english"), value: "en" },
	];

	return (
		<div className="flex flex-col gap-4 rounded-[1.75rem] bg-muted px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0 space-y-1.5">
				<div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
					<Languages className="size-4 text-muted-foreground" />
					{t("language")}
				</div>
				<p className="max-w-md text-sm leading-6 text-muted-foreground">{t("language.description")}</p>
			</div>
			<div className="inline-flex shrink-0 self-start rounded-xl bg-background p-1 sm:self-center">
				{languageOptions.map((option) => (
					<button
						key={option.value}
						type="button"
						disabled={!isReady}
						onClick={() => setInterfaceLanguage(option.value)}
						className={cn(
							"h-9 rounded-lg px-3 text-sm font-medium transition-colors",
							interfaceLanguage === option.value
								? "bg-primary text-primary-foreground shadow-sm"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
							!isReady && "cursor-not-allowed opacity-50"
						)}>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}

function AutoplayPreference({
	disabled,
	enabled,
	onToggle,
}: {
	disabled: boolean;
	enabled: boolean;
	onToggle: () => void;
}) {
	const { t } = useI18n();

	return (
		<div className="flex flex-col gap-4 rounded-[1.75rem] bg-muted px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0 space-y-1.5">
				<div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
					<PlayCircle className="size-4 text-muted-foreground" />
					{t("autoplay.title")}
				</div>
				<p className="max-w-md text-sm leading-6 text-muted-foreground">{t("autoplay.description")}</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={enabled}
				disabled={disabled}
				onClick={onToggle}
				className={`relative inline-flex h-7 w-12 shrink-0 items-center self-start rounded-full transition sm:self-center ${enabled ? "bg-foreground" : "bg-background"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
				<span
					className={`inline-block size-5 rounded-full bg-background transition-transform ${enabled ? "translate-x-6" : "translate-x-1"} ${enabled ? "bg-background" : "bg-foreground"}`}
				/>
			</button>
		</div>
	);
}

export default function MediaTab() {
	const { data: storageUsage } = trpc.user.getStorageUsage.useQuery();
	const { isReady, mediaAutoplayEnabled, setMediaAutoplayEnabled } = useUserPreferences();
	const { locale, t } = useI18n();
	const { fileSize, files } = storageUsage || { fileSize: 0, files: 0 };

	const usedSpaceBytes = fileSize || 0;
	const totalFiles = files || 0;

	return (
		<div className="space-y-4 py-1">
			<div className="rounded-[1.75rem] bg-muted p-5">
				<div className="mb-5 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-foreground">
					<HardDrive className="size-4 text-muted-foreground" />
					<span>{t("storage.local")}</span>
				</div>

				<div className="space-y-3">
					<StorageMetric label={t("storage.used")} value={formatSize(usedSpaceBytes, { locale })} />
					<StorageMetric label={t("files")} value={totalFiles.toLocaleString(locale)} />
				</div>
			</div>

			<LanguagePreference />

			<AutoplayPreference
				disabled={!isReady}
				enabled={mediaAutoplayEnabled}
				onToggle={() => setMediaAutoplayEnabled(!mediaAutoplayEnabled)}
			/>
		</div>
	);
}
