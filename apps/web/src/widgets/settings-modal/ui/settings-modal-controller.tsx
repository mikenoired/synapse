"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { getSettingsCloseHref } from "@/features/settings/lib/settings-modal-url";
import {
	LEGACY_SETTINGS_QUERY_PARAM,
	getSettingsTab,
	SETTINGS_QUERY_PARAM,
} from "@/features/settings/model/settings-tabs";

import { SettingsModal } from "./settings-modal";

export function SettingsModalController() {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const rawTab = searchParams.get(SETTINGS_QUERY_PARAM) ?? searchParams.get(LEGACY_SETTINGS_QUERY_PARAM);
	const isOpen = searchParams.has(SETTINGS_QUERY_PARAM) || searchParams.has(LEGACY_SETTINGS_QUERY_PARAM);
	const activeTab = getSettingsTab(rawTab);
	const closeHref = getSettingsCloseHref(pathname, searchParams);

	const handleClose = () => {
		router.replace(closeHref, { scroll: false });
	};

	return <SettingsModal activeTab={activeTab} closeHref={closeHref} open={isOpen} onClose={handleClose} />;
}
