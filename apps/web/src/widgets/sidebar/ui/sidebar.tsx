"use client";

import type { LucideProps } from "lucide-react";
import { Home, Network, Plus, Settings, Tag } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { useCallback } from "react";

import { getSettingsHref } from "@/features/settings/lib/settings-modal-url";
import { DEFAULT_SETTINGS_TAB, SETTINGS_QUERY_PARAM } from "@/features/settings/model/settings-tabs";
import { useDashboard } from "@/shared/lib/dashboard-context";
import { useI18n } from "@/shared/lib/i18n";

import DesktopSidebar from "./desktop-sidebar";
import MobileSidebar from "./mobile-sidebar";

export type NavItem =
	| {
			href: string;
			icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
			label: string;
			isActive?: boolean;
			action?: undefined;
			onMouseEnter?: undefined;
	  }
	| {
			action: () => void;
			icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;
			label: string;
			onMouseEnter: () => void;
			isActive?: boolean;
			href?: undefined;
	  };

export default function Sidebar() {
	const { openAddDialog } = useDashboard();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { t } = useI18n();

	const preloadAddContentDialog = useCallback(() => {
		import("@/features/add-content/ui/add-content-dialog");
	}, []);

	const navItems: NavItem[] = [
		{
			action: () => openAddDialog(),
			icon: Plus,
			label: t("add"),
			onMouseEnter: preloadAddContentDialog,
		},
		{ href: "/dashboard", icon: Home, label: t("home") },
		{ href: "/dashboard/tags", icon: Tag, label: t("tags") },
		{ href: "/dashboard/graph", icon: Network, label: t("graph") },
		{
			href: getSettingsHref(pathname, searchParams, DEFAULT_SETTINGS_TAB),
			icon: Settings,
			isActive: searchParams.has(SETTINGS_QUERY_PARAM),
			label: t("settings"),
		},
	];

	return (
		<>
			<MobileSidebar navItems={navItems} />
			<DesktopSidebar navItems={navItems} />
		</>
	);
}
