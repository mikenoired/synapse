"use client";

import { Button } from "@synapse/ui/components";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import { Bold, Code2, Heading2, Italic, List, ListOrdered, Underline } from "lucide-react";

interface EditorProps {
	data?: JSONContent | null;
	onChange?: (data: JSONContent) => void;
	readOnly?: boolean;
}

export function Editor({ data, onChange, readOnly = false }: EditorProps) {
	const lowlight = createLowlight(common);
	const editor = useEditor({
		immediatelyRender: false,
		shouldRerenderOnTransaction: true,
		extensions: [
			StarterKit.configure({ codeBlock: false }),
			CodeBlockLowlight.configure({ lowlight }),
			Placeholder.configure({
				placeholder: "Начните с мысли, идеи или наблюдения…",
			}),
		],
		editorProps: {
			attributes: {
				class:
					"min-h-[420px] px-1 py-5 text-base leading-7 outline-none [&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted-foreground/60 [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
			},
		},
		content: data || "",
		editable: !readOnly,
		onUpdate({ editor }) {
			if (onChange) onChange(editor.getJSON());
		},
	});

	return (
		<div className="w-full">
			{editor && !readOnly && (
				<div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-y border-border/70 bg-background/95 py-2 backdrop-blur">
					<Button
						type="button"
						size="icon"
						variant={editor.isActive("bold") ? "secondary" : "ghost"}
						onClick={() => editor.chain().focus().toggleBold().run()}
						aria-label="Полужирный"
						title="Полужирный">
						<Bold className="size-4" />
					</Button>
					<Button
						type="button"
						size="icon"
						variant={editor.isActive("italic") ? "secondary" : "ghost"}
						onClick={() => editor.chain().focus().toggleItalic().run()}
						aria-label="Курсив"
						title="Курсив">
						<Italic className="size-4" />
					</Button>
					<Button
						type="button"
						size="icon"
						variant={editor.isActive("underline") ? "secondary" : "ghost"}
						onClick={() => editor.chain().focus().toggleUnderline().run()}
						aria-label="Подчёркнутый"
						title="Подчёркнутый">
						<Underline className="size-4" />
					</Button>
					<Button
						type="button"
						size="icon"
						variant={editor.isActive("code") ? "secondary" : "ghost"}
						onClick={() => editor.chain().focus().toggleCode().run()}
						aria-label="Код"
						title="Код">
						<Code2 className="size-4" />
					</Button>
					<div className="mx-1 h-5 w-px bg-border" />
					<Button
						type="button"
						size="icon"
						variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
						onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
						aria-label="Заголовок"
						title="Заголовок">
						<Heading2 className="size-4" />
					</Button>
					<Button
						type="button"
						size="icon"
						variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						aria-label="Маркированный список"
						title="Маркированный список">
						<List className="size-4" />
					</Button>
					<Button
						type="button"
						size="icon"
						variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						aria-label="Нумерованный список"
						title="Нумерованный список">
						<ListOrdered className="size-4" />
					</Button>
				</div>
			)}
			<EditorContent editor={editor} />
		</div>
	);
}

export function editorDataToText(data: JSONContent): string {
	if (!data || !data.content) return "";

	function extractText(nodes: any[]): string {
		return nodes
			.map((node) => {
				if (node.type === "text") return node.text || "";
				if (node.content) return extractText(node.content);
				return "";
			})
			.filter(Boolean)
			.join(" ");
	}

	return extractText(data.content)
		.replace(/<[^>]*>/g, "")
		.substring(0, 200);
}

export function editorDataToShortText(data: JSONContent, maxLength: number = 150): string {
	if (!data || !data.content) return "";

	let text = "";
	let currentLength = 0;

	function walk(nodes: any[]): void {
		for (const node of nodes) {
			if (currentLength >= maxLength) break;
			let nodeText = "";
			if (node.type === "text") {
				nodeText = node.text || "";
			} else if (node.content) {
				nodeText = extractText(node.content);
			}
			if (currentLength + nodeText.length > maxLength) {
				nodeText = `${nodeText.substring(0, maxLength - currentLength - 3)}...`;
			}
			if (nodeText) {
				text += (text ? " " : "") + nodeText;
				currentLength = text.length;
			}
		}
	}

	function extractText(nodes: any[]): string {
		return nodes
			.map((node) => {
				if (node.type === "text") return node.text || "";
				if (node.content) return extractText(node.content);
				return "";
			})
			.filter(Boolean)
			.join(" ");
	}

	walk(data.content);
	return text;
}
