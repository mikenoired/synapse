import { getSettingsCloseHref } from "@/features/settings/lib/settings-modal-url";
import {
	LEGACY_SETTINGS_QUERY_PARAM,
	getSettingsTab,
	SETTINGS_QUERY_PARAM,
} from "@/features/settings/model/settings-tabs";
import dynamic from "@/shared/router/dynamic";
import { usePathname, useRouter, useSearchParams } from "@/shared/router/navigation";

const SettingsModal = dynamic(() =>
	import("./settings-modal").then((mod) => ({ default: mod.SettingsModal }))
);

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

	if (!isOpen) return null;

	return <SettingsModal activeTab={activeTab} closeHref={closeHref} open={isOpen} onClose={handleClose} />;
}
