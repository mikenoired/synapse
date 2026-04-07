"use client";

import dynamic from "next/dynamic";

import type { Content } from "@/shared/lib/schemas";

import { useModal } from "./modal-context";

// Динамическая загрузка модалок
const AudioViewerModal = dynamic(() =>
	import("../viewer/audio-viewer").then((mod) => ({ default: mod.AudioViewerModal }))
);

const DocumentViewerModal = dynamic(() =>
	import("../viewer/document-viewer").then((mod) => ({ default: mod.DocumentViewerModal }))
);

const LinkViewerModal = dynamic(() =>
	import("../viewer/link-viewer").then((mod) => ({ default: mod.LinkViewerModal }))
);

const NoteViewerModal = dynamic(() =>
	import("../viewer/note-viewer").then((mod) => ({ default: mod.NoteViewerModal }))
);

const TodoViewerModal = dynamic(() =>
	import("../viewer/todo-viewer").then((mod) => ({ default: mod.TodoViewerModal }))
);

const MediaViewerModal = dynamic(() =>
	import("../viewer/media-viewer").then((mod) => ({ default: mod.MediaViewerModal }))
);

// Registry для типов контента
const VIEWER_REGISTRY: Record<Content["type"], any> = {
	audio: AudioViewerModal,
	media: MediaViewerModal,
	note: NoteViewerModal,
	link: LinkViewerModal,
	todo: TodoViewerModal,
	pdf: DocumentViewerModal,
	docx: DocumentViewerModal,
	epub: DocumentViewerModal,
	xlsx: DocumentViewerModal,
	csv: DocumentViewerModal,
	doc: DocumentViewerModal,
};

export function ModalManager() {
	const { activeModal, closeModal, isOpen } = useModal();

	if (!isOpen || !activeModal || !activeModal.item) return null;

	const { type, contentType, item, props = {} } = activeModal;

	if (type === "viewer" && contentType) {
		const ModalComponent = VIEWER_REGISTRY[contentType];

		if (!ModalComponent) {
			return null;
		}

		return <ModalComponent open={isOpen} onOpenChange={closeModal} item={item} {...props} />;
	}

	return null;
}
