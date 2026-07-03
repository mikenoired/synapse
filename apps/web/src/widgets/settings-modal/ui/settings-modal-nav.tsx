"use client";

import { cn } from "@synapse/ui/cn";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { getSettingsHref } from "@/features/settings/lib/settings-modal-url";
import { settingsTabs, type SettingsTabKey } from "@/features/settings/model/settings-tabs";

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
		<span className="flex min-w-0 items-center gap-3">
			<Icon className="size-[18px] shrink-0" />
			<span className="truncate">{label}</span>
		</span>
	);
}

export function SettingsModalNav({ activeTab, pathname, search }: SettingsModalNavProps) {
	const searchParams = new URLSearchParams(search);

	return (
		<nav className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 md:grid-cols-1">
			{settingsTabs.map((tab) => (
				<Link
					key={tab.key}
					href={getSettingsHref(pathname, searchParams, tab.key)}
					scroll={false}
					aria-current={activeTab === tab.key ? "page" : undefined}
					className={cn(
						"flex h-10 min-w-0 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-200",
						activeTab === tab.key
							? "bg-primary text-primary-foreground shadow-sm"
							: "text-muted-foreground hover:bg-background/70 hover:text-foreground"
					)}>
					<TabContent icon={tab.icon} label={tab.label} />
				</Link>
			))}
		</nav>
	);
}
