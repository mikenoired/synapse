"use client";

import type { LucideProps } from "lucide-react";
import { Home, Network, Plus, Settings, Tag } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import { useCallback } from "react";

import { getSettingsHref } from "@/features/settings/lib/settings-modal-url";
import { DEFAULT_SETTINGS_TAB, SETTINGS_QUERY_PARAM } from "@/features/settings/model/settings-tabs";
import { useDashboard } from "@/shared/lib/dashboard-context";

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

	const preloadAddContentDialog = useCallback(() => {
		import("@/features/add-content/ui/add-content-dialog");
	}, []);

	const navItems: NavItem[] = [
		{
			action: () => openAddDialog(),
			icon: Plus,
			label: "Add",
			onMouseEnter: preloadAddContentDialog,
		},
		{ href: "/dashboard", icon: Home, label: "Main" },
		{ href: "/dashboard/tags", icon: Tag, label: "Tags" },
		{ href: "/dashboard/graph", icon: Network, label: "Graph" },
		{
			href: getSettingsHref(pathname, searchParams, DEFAULT_SETTINGS_TAB),
			icon: Settings,
			isActive: searchParams.has(SETTINGS_QUERY_PARAM),
			label: "Settings",
		},
	];

	return (
		<>
			<MobileSidebar navItems={navItems} />
			<DesktopSidebar navItems={navItems} />
		</>
	);
}
