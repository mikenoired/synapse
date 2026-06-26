import { redirect } from "next/navigation";

import { getSettingsHref } from "@/features/settings/lib/settings-modal-url";
import { getSettingsTab } from "@/features/settings/model/settings-tabs";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
	const { tab } = await searchParams;

	redirect(getSettingsHref("/dashboard", null, getSettingsTab(tab)));
}
