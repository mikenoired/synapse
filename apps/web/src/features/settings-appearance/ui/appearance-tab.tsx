"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { SIDEBAR_ANIMATION } from "@/shared/config/animations";
import { useI18n } from "@/shared/lib/i18n";

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

export default function AppearanceTab() {
	const { theme, setTheme } = useTheme();
	const { t } = useI18n();
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
		</div>
	);
}
