"use client";

import { cn } from "@synapse/ui/cn";
import { prose } from "@synapse/ui/prose";
import DOMPurify from "dompurify";
import { Edit2, Trash2 } from "lucide-react";
import { useState } from "react";

import type { Content } from "@/shared/lib/schemas";
import { calculateReadingTime } from "@/shared/lib/schemas";

import { BaseModal } from "../base";
import { ActionBar } from "../components";
import { useModalKeyboard } from "../hooks";
import { ModalBody, ModalHeader } from "../layout";

function ensureDataUri(base64: string): string {
	if (!base64) return "";
	if (base64.startsWith("data:")) return base64;
	return `data:image/jpeg;base64,${base64}`;
}

interface DocumentViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

export function DocumentViewerModal({
	open,
	onOpenChange,
	item,
	onEdit,
	onDelete,
}: DocumentViewerModalProps) {
	const [isDeleting, setIsDeleting] = useState(false);

	useModalKeyboard({
		enabled: open,
		onEscape: () => onOpenChange(false),
	});

	const getDocumentIcon = (type: string) => {
		const icons: Record<string, string> = {
			pdf: "📄",
			docx: "📝",
			epub: "📚",
			xlsx: "📊",
			xls: "📊",
			csv: "📈",
		};
		return icons[type] || "📄";
	};

	const getDocumentTypeName = (type: string) => {
		const names: Record<string, string> = {
			pdf: "PDF Document",
			docx: "Word Document",
			epub: "EPUB Book",
			xlsx: "Excel Spreadsheet",
			xls: "Excel Spreadsheet",
			csv: "CSV File",
		};
		return names[type] || "Document";
	};

	const handleEdit = () => {
		if (onEdit) onEdit(item.id);
	};

	const handleDelete = async () => {
		if (!onDelete) return;

		setIsDeleting(true);
		try {
			await onDelete(item.id);
			onOpenChange(false);
		} catch {
		} finally {
			setIsDeleting(false);
		}
	};

	const readingTime = calculateReadingTime(item.content);

	const isHtmlContent = (content: string): boolean => {
		const htmlTagRegex = /<[^>]+>/g;
		return htmlTagRegex.test(content);
	};

	const actions = [
		...(onEdit
			? [
					{
						icon: Edit2,
						label: "Редактировать",
						onClick: handleEdit,
						variant: "outline" as const,
					},
				]
			: []),
		...(onDelete
			? [
					{
						icon: Trash2,
						label: "Удалить",
						onClick: handleDelete,
						variant: "destructive" as const,
						disabled: isDeleting,
						loading: isDeleting,
					},
				]
			: []),
	];

	return (
		<BaseModal open={open} onOpenChange={onOpenChange} size="xl">
			<div className="flex flex-col h-full">
				<ModalHeader>
					<div className="flex items-start justify-between gap-4">
						<div className="flex items-center gap-3 min-w-0 flex-1">
							<div className="text-3xl">{getDocumentIcon(item.type)}</div>
							<div className="min-w-0 flex-1">
								<h1 className="text-xl font-semibold text-foreground truncate">
									{item.title || "Untitled Document"}
								</h1>
								<p className="text-sm text-muted-foreground">{getDocumentTypeName(item.type)}</p>
							</div>
						</div>
					</div>

					<div className="space-y-3 mt-4">
						<ModalHeader.Info createdAt={item.created_at} readingTime={readingTime} />

						{item.tags.length > 0 && <ModalHeader.Tags tags={item.tags} />}

						{actions.length > 0 && <ActionBar actions={actions} />}
					</div>
				</ModalHeader>

				<ModalBody scrollable>
					{item.thumbnail_base64 && (
						<div className="mb-6">
							<img
								src={ensureDataUri(item.thumbnail_base64)}
								alt="Document thumbnail"
								className="w-full max-w-md mx-auto rounded-lg shadow-md"
							/>
						</div>
					)}

					<div className={cn("max-w-none document-content", prose)}>
						{isHtmlContent(item.content) ? (
							<div
								dangerouslySetInnerHTML={{
									__html: DOMPurify.sanitize(item.content, {
										ADD_TAGS: ["img", "table", "thead", "tbody", "tr", "td", "th"],
										ADD_ATTR: ["src", "alt", "title", "class", "style", "colspan", "rowspan"],
										ALLOW_DATA_ATTR: false,
									}),
								}}
							/>
						) : (
							<div className="whitespace-pre-wrap text-foreground">{item.content}</div>
						)}
					</div>
				</ModalBody>
			</div>
		</BaseModal>
	);
}
