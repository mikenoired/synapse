"use client";

import { cn } from "@synapse/ui/cn";
import { Switch } from "@synapse/ui/components";
import { motion } from "framer-motion";
import { Monitor, Moon, Palette, Sparkles, Sun, Languages } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { SIDEBAR_ANIMATION } from "@/shared/config/animations";
import { useI18n } from "@/shared/lib/i18n";
import type { InterfaceLanguage } from "@/shared/lib/user-preferences";
import { useUserPreferences } from "@/shared/lib/user-preferences-context";

const themeOptions = [
	{
		value: "system",
		icon: Monitor,
		labelKey: "appearance.theme.system",
	},
	{
		value: "light",
		icon: Sun,
		labelKey: "appearance.theme.light",
	},
	{
		value: "dark",
		icon: Moon,
		labelKey: "appearance.theme.dark",
	},
] as const;

function LanguagePreference() {
	const { interfaceLanguage, isReady, setInterfaceLanguage } = useUserPreferences();
	const { t } = useI18n();
	const languageOptions: { label: string; value: InterfaceLanguage }[] = [
		{ label: t("language.russian"), value: "ru" },
		{ label: t("language.english"), value: "en" },
	];

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0 space-y-1.5">
				<div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
					<Languages className="size-4 text-muted-foreground" />
					{t("language")}
				</div>
				<p className="max-w-md text-sm leading-5 text-muted-foreground">{t("language.description")}</p>
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

export default function AppearanceTab() {
	const { theme, setTheme } = useTheme();
	const { t } = useI18n();
	const {
		autoTagColorEnabled,
		isReady,
		noteSparklesEnabled,
		setAutoTagColorEnabled,
		setNoteSparklesEnabled,
	} = useUserPreferences();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	return (
		<div className="space-y-6 py-1">
			<div>
				<h2 className="text-xl font-semibold tracking-tight">{t("appearance.title")}</h2>
				<p className="mt-1 text-sm text-muted-foreground">{t("appearance.description")}</p>
			</div>

			<fieldset className="space-y-3" disabled={!mounted}>
				<legend id="appearance-theme-label" className="text-sm font-medium">
					{t("appearance.theme.title")}
				</legend>
				<div
					className="inline-flex rounded-full bg-muted p-1"
					role="radiogroup"
					aria-labelledby="appearance-theme-label">
					{themeOptions.map(({ value, icon: Icon, labelKey }) => {
						const selected = mounted && theme === value;

						return (
							<button
								key={value}
								type="button"
								role="radio"
								aria-checked={selected}
								aria-label={t(labelKey)}
								title={t(labelKey)}
								onClick={() => setTheme(value)}
								className="group relative flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-checked:text-foreground">
								{selected && (
									<motion.span
										layoutId="appearance-theme-selection"
										className="absolute inset-0 rounded-full bg-background shadow-sm"
										transition={SIDEBAR_ANIMATION}
										aria-hidden="true"
									/>
								)}
								<Icon className="relative z-10 size-4 transition-colors" />
							</button>
						);
					})}
				</div>
			</fieldset>

			<LanguagePreference />

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1.5">
					<div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
						<Sparkles className="size-4 text-muted-foreground" />
						{t("appearance.noteSparkles.title")}
					</div>
					<p className="max-w-md text-sm leading-5 text-muted-foreground">
						{t("appearance.noteSparkles.description")}
					</p>
				</div>
				<Switch
					checked={noteSparklesEnabled}
					aria-label={t("appearance.noteSparkles.title")}
					disabled={!isReady}
					className="self-start sm:self-center"
					onToggle={() => setNoteSparklesEnabled(!noteSparklesEnabled)}
				/>
			</div>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1.5">
					<div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
						<Palette className="size-4 text-muted-foreground" />
						{t("appearance.tagColors.title")}
					</div>
					<p className="max-w-md text-sm leading-5 text-muted-foreground">
						{t("appearance.tagColors.description")}
					</p>
				</div>
				<Switch
					aria-label={t("appearance.tagColors.title")}
					disabled={!isReady}
					checked={autoTagColorEnabled}
					className="self-start sm:self-center"
					onToggle={() => setAutoTagColorEnabled(!autoTagColorEnabled)}
				/>
			</div>
		</div>
	);
}
