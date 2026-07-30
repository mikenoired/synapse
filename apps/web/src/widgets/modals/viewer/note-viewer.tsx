"use client";

import { cn } from "@synapse/ui/cn";
import { prose } from "@synapse/ui/prose";
import { motion } from "framer-motion";
import { Edit2, FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { Content } from "@/shared/lib/schemas";
import { useUserPreferences } from "@/shared/lib/user-preferences-context";
import { PixelSparkles } from "@/shared/ui/pixel-sparkles";
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
	const [sparklesStartedFor, setSparklesStartedFor] = useState<string | null>(null);
	const [sideWidths, setSideWidths] = useState({ left: 0, right: 0 });
	const [noteContent, setNoteContent] = useState<HTMLDivElement | null>(null);
	const { isReady: preferencesReady, noteSparklesEnabled } = useUserPreferences();

	useEffect(() => {
		setSparklesStartedFor(null);

		if (!open) {
			return;
		}

		const timeout = window.setTimeout(() => setSparklesStartedFor(item.id), 10_000);
		return () => window.clearTimeout(timeout);
	}, [open, item.id]);

	useEffect(() => {
		if (!open) {
			setSideWidths({ left: 0, right: 0 });
			return;
		}

		const updateSideWidths = () => {
			if (!noteContent) {
				setSideWidths({ left: 0, right: 0 });
				return;
			}

			const bounds = noteContent.getBoundingClientRect();
			if (window.innerWidth <= bounds.width) {
				setSideWidths({ left: 0, right: 0 });
				return;
			}

			setSideWidths({ left: Math.max(0, bounds.left), right: Math.max(0, window.innerWidth - bounds.right) });
		};

		if (!noteContent) return;

		const observer = new ResizeObserver(updateSideWidths);
		observer.observe(noteContent);
		window.addEventListener("resize", updateSideWidths);
		updateSideWidths();

		return () => {
			observer.disconnect();
			window.removeEventListener("resize", updateSideWidths);
		};
	}, [noteContent, open]);

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
	const showSparkles =
		preferencesReady &&
		noteSparklesEnabled &&
		sparklesStartedFor === item.id &&
		sideWidths.left > 0 &&
		sideWidths.right > 0;

	return (
		<>
			<BaseModal
				open={open}
				onOpenChange={onOpenChange}
				size="lg"
				overlayDecoration={
					showSparkles ? (
						<motion.div
							aria-hidden="true"
							className="pointer-events-none absolute inset-0 z-0 overflow-hidden text-muted-foreground opacity-70"
							initial={{ opacity: 0 }}
							animate={{ opacity: 0.7 }}
							transition={{ duration: 5, ease: "easeOut" }}>
							<div
								className="absolute inset-y-0 left-0"
								style={{
									width: sideWidths.left,
									maskImage: "linear-gradient(to right, black 0%, black 58%, transparent 100%)",
									WebkitMaskImage: "linear-gradient(to right, black 0%, black 58%, transparent 100%)",
								}}>
								<PixelSparkles pixelSize={5} speed={0.38} fireSpeed={0.35} density={0.26} />
							</div>
							<div
								className="absolute inset-y-0 right-0"
								style={{
									width: sideWidths.right,
									maskImage: "linear-gradient(to left, black 0%, black 58%, transparent 100%)",
									WebkitMaskImage: "linear-gradient(to left, black 0%, black 58%, transparent 100%)",
								}}>
								<PixelSparkles pixelSize={5} speed={0.38} fireSpeed={0.35} density={0.26} />
							</div>
						</motion.div>
					) : undefined
				}>
				<div className="mx-auto flex h-full w-full max-w-4xl flex-col">
					<ModalHeader>
						<div className="space-y-4">
							<ModalHeader.Meta icon={FileText} type="Заметка" />

							<ModalHeader.Title>{item.title || "Без названия"}</ModalHeader.Title>

							<ModalHeader.Info createdAt={item.created_at} updatedAt={item.updated_at} />

							{item.tags.length > 0 && <ModalHeader.Tags tags={item.tags} tagIds={item.tag_ids} />}

							{actions.length > 0 && <ActionBar actions={actions} />}
						</div>
					</ModalHeader>

					<ModalBody>
						<div ref={setNoteContent} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
							<div className={cn("max-w-none", prose)}>{renderContent()}</div>
						</div>
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
