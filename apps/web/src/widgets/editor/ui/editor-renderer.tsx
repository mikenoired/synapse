"use client";

import { cn } from "@synapse/ui/cn";
import { prose } from "@synapse/ui/prose";
import type { JSONContent } from "@tiptap/core";

import { Editor } from "./editor";

interface EditorRendererProps {
	data: JSONContent | null;
}

export function EditorRenderer({ data }: EditorRendererProps) {
	if (!data || !data.content) return null;

	return (
		<div className={cn("synapse-editor-content max-w-none", prose)}>
			<Editor data={data} readOnly />
		</div>
	);
}
