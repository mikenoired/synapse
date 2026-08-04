"use client";

import type { JSONContent } from "@tiptap/core";

import { Editor } from "./editor";

interface EditorRendererProps {
	data: JSONContent | null;
}

export function EditorRenderer({ data }: EditorRendererProps) {
	if (!data || !data.content) return null;

	return (
		<div className="synapse-editor-content">
			<Editor data={data} readOnly />
		</div>
	);
}
