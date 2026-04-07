"use client";

import { useState } from "react";

import type { Content } from "@/shared/lib/schemas";

import { BaseModal } from "../base";
import { useModalKeyboard } from "../hooks";
import { AddAudioForm } from "./forms/add-audio-form";
import { AddDocumentForm } from "./forms/add-document-form";
import { AddLinkForm } from "./forms/add-link-form";
import { AddMediaForm } from "./forms/add-media-form";
import { AddNoteForm } from "./forms/add-note-form";
import { AddTodoForm } from "./forms/add-todo-form";
import { ContentTypeSelector } from "./forms/content-type-selector";

interface AddContentModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialTags?: string[];
	onContentAdded?: () => void;
	preloadedFiles?: File[];
}

export function AddContentModal({
	open,
	onOpenChange,
	initialTags = [],
	onContentAdded,
	preloadedFiles = [],
}: AddContentModalProps) {
	const [contentType, setContentType] = useState<Content["type"]>("note");
	const [isFullScreen, setIsFullScreen] = useState(false);

	useModalKeyboard({
		enabled: open,
		onEscape: () => onOpenChange(false),
	});

	const handleSuccess = () => {
		onContentAdded?.();
		onOpenChange(false);
	};

	const getSize = () => {
		if (isFullScreen && contentType === "note") return "full";
		if (contentType === "note" || contentType === "todo") return "xl";
		return "lg";
	};

	const renderForm = () => {
		switch (contentType) {
			case "note":
				return (
					<AddNoteForm initialTags={initialTags} onSuccess={handleSuccess} isFullScreen={isFullScreen} />
				);
			case "todo":
				return <AddTodoForm initialTags={initialTags} onSuccess={handleSuccess} />;
			case "media":
				return (
					<AddMediaForm initialTags={initialTags} onSuccess={handleSuccess} preloadedFiles={preloadedFiles} />
				);
			case "audio":
				return <AddAudioForm initialTags={initialTags} onSuccess={handleSuccess} />;
			case "link":
				return <AddLinkForm initialTags={initialTags} onSuccess={handleSuccess} />;
			case "doc":
			case "pdf":
			case "docx":
			case "epub":
			case "xlsx":
			case "csv":
				return <AddDocumentForm initialTags={initialTags} onSuccess={handleSuccess} />;
			default:
				return null;
		}
	};

	return (
		<BaseModal
			open={open}
			onOpenChange={onOpenChange}
			size={getSize()}
			variant={isFullScreen ? "fullscreen" : "default"}>
			<ContentTypeSelector
				type={contentType}
				onTypeChange={setContentType}
				isFullScreen={isFullScreen}
				onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
			/>

			{renderForm()}
		</BaseModal>
	);
}
