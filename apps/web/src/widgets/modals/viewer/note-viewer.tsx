"use client";

import { cn } from "@synapse/ui/cn";
import { prose } from "@synapse/ui/prose";
import { Edit2, FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Content } from "@/shared/lib/schemas";
import { EditorRenderer } from "@/widgets/editor/ui/editor-renderer";

import { BaseModal } from "../base";
import { ActionBar } from "../components";
import { ConfirmDialog } from "../dialogs";
import { useModalKeyboard } from "../hooks";
import { ModalBody, ModalHeader } from "../layout";
import { showToast } from "../utils";

interface NoteViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

export function NoteViewerModal({ open, onOpenChange, item, onEdit, onDelete }: NoteViewerModalProps) {
	const router = useRouter();
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	useModalKeyboard({
		enabled: open,
		onEscape: () => onOpenChange(false),
		shortcuts: [
			{
				key: "e",
				ctrl: true,
				handler: () => handleEdit(),
				preventDefault: true,
			},
		],
	});

	const handleEdit = () => {
		if (onEdit) {
			onEdit(item.id);
		} else {
			router.push(`/edit/${item.id}`);
		}
		onOpenChange(false);
	};

	const handleDelete = () => {
		if (onDelete) setShowDeleteConfirm(true);
	};

	const confirmDelete = async () => {
		if (onDelete) {
			try {
				await onDelete(item.id);
				showToast.success("Заметка удалена");
				onOpenChange(false);
			} catch {
				showToast.error("Ошибка при удалении");
			}
		}
	};

	const renderContent = () => {
		if (item.type === "note") {
			try {
				const parsedData = JSON.parse(item.content);
				if (parsedData.type === "doc") return <EditorRenderer data={parsedData} />;
			} catch {
				// Fallback to plain text
			}
		}

		return (
			<pre className="whitespace-pre-wrap font-sans text-foreground leading-relaxed">{item.content}</pre>
		);
	};

	const actions = [
		{
			icon: Edit2,
			label: "Редактировать",
			onClick: handleEdit,
			variant: "outline" as const,
		},
		...(onDelete
			? [
					{
						icon: Trash2,
						label: "Удалить",
						onClick: handleDelete,
						variant: "destructive" as const,
					},
				]
			: []),
	];

	return (
		<>
			<BaseModal open={open} onOpenChange={onOpenChange} size="lg">
				<div className="flex flex-col h-full max-w-[750px] mx-auto w-full">
					<ModalHeader>
						<div className="space-y-4">
							<ModalHeader.Meta icon={FileText} type="Заметка" />

							{item.title && <ModalHeader.Title>{item.title}</ModalHeader.Title>}

							<ModalHeader.Info createdAt={item.created_at} updatedAt={item.updated_at} />

							{item.tags.length > 0 && <ModalHeader.Tags tags={item.tags} />}

							<ActionBar actions={actions} />
						</div>
					</ModalHeader>

					<ModalBody>
						<div className={cn("max-w-none", prose)}>{renderContent()}</div>
					</ModalBody>
				</div>
			</BaseModal>

			<ConfirmDialog
				open={showDeleteConfirm}
				onOpenChange={setShowDeleteConfirm}
				title="Удалить заметку?"
				description="Это действие нельзя отменить. Заметка будет удалена навсегда."
				confirmText="Удалить"
				cancelText="Отмена"
				variant="destructive"
				onConfirm={confirmDelete}
			/>
		</>
	);
}
