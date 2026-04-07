import { redirect } from "next/navigation";

import { getSettingsHref } from "@/features/settings/lib/settings-modal-url";
import { getSettingsTab } from "@/features/settings/model/settings-tabs";
import { createContext } from "@/server/context";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const { tab } = await searchParams;

	const ctx = await createContext({});
	if (!ctx.user) redirect("/");

	redirect(getSettingsHref("/dashboard", null, getSettingsTab(tab)));
}
