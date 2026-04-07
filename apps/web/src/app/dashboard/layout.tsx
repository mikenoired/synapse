import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createContext } from "@/server/context";
import { DashboardProvider } from "@/shared/lib/dashboard-context";
import { SettingsModalController } from "@/widgets/settings-modal/ui/settings-modal-controller";
import Sidebar from "@/widgets/sidebar/ui/sidebar";

import DashboardWrapper from "./dashboard-wrapper";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
	const { user } = await createContext({});

	if (!user) {
		redirect("/");
	}

	return (
		<DashboardProvider>
			<div className="h-screen min-h-0 flex w-full bg-muted overflow-hidden">
				<Sidebar />
				<DashboardWrapper>{children}</DashboardWrapper>
				<SettingsModalController />
			</div>
		</DashboardProvider>
	);
}
