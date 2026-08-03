"use client";

import { TabItem, Tabs, TabsList } from "@synapse/ui/components";

import { getSettingsHref } from "@/features/settings/lib/settings-modal-url";
import { isSettingsTab, settingsTabs, type SettingsTabKey } from "@/features/settings/model/settings-tabs";
import { useI18n } from "@/shared/lib/i18n";
import { useRouter } from "@/shared/router/navigation";

interface SettingsModalNavProps {
	activeTab: SettingsTabKey;
	pathname: string;
	search: string;
}

export function SettingsModalNav({ activeTab, pathname, search }: SettingsModalNavProps) {
	const router = useRouter();
	const searchParams = new URLSearchParams(search);
	const { t } = useI18n();

	const handleValueChange = (value: string) => {
		if (!isSettingsTab(value)) return;
		router.replace(getSettingsHref(pathname, searchParams, value), { scroll: false });
	};

	return (
		<Tabs value={activeTab} onValueChange={handleValueChange} orientation="vertical">
			<TabsList orientation="vertical" aria-label={t("settings.title")}>
				{settingsTabs.map((tab) => (
					<TabItem
						key={tab.key}
						value={tab.key}
						icon={tab.icon}
						label={t(tab.labelKey)}
						className="h-10 w-full justify-start"
					/>
				))}
			</TabsList>
		</Tabs>
	);
}
