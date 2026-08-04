import dynamic from "@/shared/router/dynamic";

import { useModal } from "./modal-context";

const UnifiedViewerModal = dynamic(() =>
	import("../viewer/unified-viewer").then((mod) => ({ default: mod.UnifiedViewerModal }))
);

export function ModalManager() {
	const { activeModal, closeModal, dismissModal, isOpen, navigateViewer } = useModal();

	if (!isOpen || !activeModal || !activeModal.item) return null;

	const { type, item, props = {} } = activeModal;

	if (type === "viewer") {
		return (
			<UnifiedViewerModal
				open={isOpen}
				onOpenChange={closeModal}
				onTagNavigate={dismissModal}
				onViewerNavigate={navigateViewer}
				item={item}
				{...props}
			/>
		);
	}

	return null;
}
