"use client";

import { cn } from "@synapse/ui/cn";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { getSettingsHref } from "@/features/settings/lib/settings-modal-url";
import { settingsTabs, type SettingsTabKey } from "@/features/settings/model/settings-tabs";
import { SIDEBAR_ANIMATION } from "@/shared/config/animations";
import { getHighlightClipPath, useHighlightNavigation } from "@/shared/lib/use-highlight-navigation";

interface SettingsModalNavProps {
	activeTab: SettingsTabKey;
	pathname: string;
	search: string;
}

interface TabContentProps {
	icon: LucideIcon;
	label: string;
}

function TabContent({ icon: Icon, label }: TabContentProps) {
	return (
		<span className="flex items-center gap-3">
			<Icon className="size-[18px] shrink-0" />
			<span className="truncate">{label}</span>
		</span>
	);
}

export function SettingsModalNav({ activeTab, pathname, search }: SettingsModalNavProps) {
	const keys = settingsTabs.map((tab) => tab.key);
	const { activeFrame, containerRef, frames, registerItem } = useHighlightNavigation(keys, activeTab);
	const searchParams = new URLSearchParams(search);

	return (
		<div ref={containerRef} className="relative flex gap-2 md:flex-col">
			{activeFrame && (
				<motion.div
					animate={{
						height: activeFrame.height,
						left: activeFrame.left,
						top: activeFrame.top,
						width: activeFrame.width,
					}}
					className="pointer-events-none absolute rounded-lg bg-primary"
					initial={false}
					transition={{ ...SIDEBAR_ANIMATION, ease: [0.22, 1, 0.36, 1] }}
				/>
			)}
			{settingsTabs.map((tab) => (
				<Link
					key={tab.key}
					ref={registerItem(tab.key)}
					href={getSettingsHref(pathname, searchParams, tab.key)}
					scroll={false}
					className={cn(
						"group relative z-10 flex h-10 min-w-0 flex-1 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-300 md:flex-none",
						activeTab === tab.key ? "text-muted-foreground" : "text-muted-foreground hover:text-foreground"
					)}>
					<span className="pointer-events-none flex w-full items-center">
						<TabContent icon={tab.icon} label={tab.label} />
					</span>
					<span
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 flex items-center rounded-lg px-3 text-primary-foreground transition-[clip-path] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
						style={{ clipPath: getHighlightClipPath(frames[tab.key], activeFrame) }}>
						<TabContent icon={tab.icon} label={tab.label} />
					</span>
				</Link>
			))}
		</div>
	);
}
