import { HardDrive, Palette, Settings2, Sparkles } from "lucide-react";

export const SETTINGS_QUERY_PARAM = "settings";
export const LEGACY_SETTINGS_QUERY_PARAM = "tab";
export const DEFAULT_SETTINGS_TAB = "general";

export const settingsTabs = [
	{ key: "general", label: "General", icon: Settings2 },
	{ key: "media", label: "Media", icon: HardDrive },
	{ key: "ai", label: "AI", icon: Sparkles },
	{ key: "theming", label: "Theming", icon: Palette },
] as const;

export type SettingsTabKey = (typeof settingsTabs)[number]["key"];

export function isSettingsTab(value?: string | null): value is SettingsTabKey {
	return settingsTabs.some((tab) => tab.key === value);
}

export function getSettingsTab(value?: string | null): SettingsTabKey {
	if (isSettingsTab(value)) {
		return value;
	}

	return DEFAULT_SETTINGS_TAB;
}
