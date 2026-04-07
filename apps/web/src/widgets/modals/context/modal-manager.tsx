"use client";

import dynamic from "next/dynamic";

import { useModal } from "./modal-context";

const UnifiedViewerModal = dynamic(() =>
	import("../viewer/unified-viewer").then((mod) => ({ default: mod.UnifiedViewerModal }))
);

export function ModalManager() {
	const { activeModal, closeModal, isOpen } = useModal();

	if (!isOpen || !activeModal || !activeModal.item) return null;

	const { type, item, props = {} } = activeModal;

	if (type === "viewer") {
		return <UnifiedViewerModal open={isOpen} onOpenChange={closeModal} item={item} {...props} />;
	}

	return null;
}
