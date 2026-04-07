"use client";

import { cn } from "@synapse/ui/cn";
import { Button } from "@synapse/ui/components";
import { prose } from "@synapse/ui/prose";
import DOMPurify from "dompurify";
import { AnimatePresence, motion } from "framer-motion";
import { Edit2, FileText, Info, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import useMouseActivity from "@/shared/hooks/use-mouse-activity";
import type { Content } from "@/shared/lib/schemas";
import { calculateReadingTime } from "@/shared/lib/schemas";

import { BaseModal } from "../base";
import { ConfirmDialog } from "../dialogs";
import { useModalKeyboard } from "../hooks";
import { showToast } from "../utils";

interface DocumentViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

function ensureDataUri(base64: string): string {
	if (!base64) return "";
	if (base64.startsWith("data:")) return base64;
	return `data:image/jpeg;base64,${base64}`;
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

export function DocumentViewerModal({ open, onOpenChange, item, onEdit, onDelete }: DocumentViewerModalProps) {
	const [showDetails, setShowDetails] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const { bind, isHovered } = useMouseActivity(1800);

	useModalKeyboard({
		enabled: open,
		onEscape: () => {
			if (showDetails) {
				setShowDetails(false);
				return;
			}

			onOpenChange(false);
		},
	});

	const readingTime = useMemo(() => calculateReadingTime(item.content), [item.content]);
	const hasHtmlContent = useMemo(() => /<[^>]+>/g.test(item.content), [item.content]);
	const sanitizedHtml = useMemo(() => {
		if (!hasHtmlContent) {
			return "";
		}

		return DOMPurify.sanitize(item.content, {
			ADD_TAGS: ["img", "table", "thead", "tbody", "tr", "td", "th"],
			ADD_ATTR: ["src", "alt", "title", "class", "style", "colspan", "rowspan"],
			ALLOW_DATA_ATTR: false,
		});
	}, [hasHtmlContent, item.content]);
	const controlsVisible = isHovered;

	return (
		<>
			<BaseModal
				open={open}
				onOpenChange={onOpenChange}
				size="full"
				variant="fullscreen"
				className="border-0 bg-black/30 shadow-none backdrop-blur-xl"
				preventScroll>
				<div className="relative h-full w-full overflow-hidden bg-black/80" {...bind}>
					{item.thumbnail_base64 && (
						<div className="absolute inset-0 overflow-hidden">
							<img
								src={ensureDataUri(item.thumbnail_base64)}
								alt=""
								className="h-full w-full scale-110 object-cover opacity-25 blur-3xl"
								draggable={false}
							/>
							<div className="absolute inset-0 bg-black/60" />
						</div>
					)}

					<div className="relative z-10 flex h-full items-center justify-center px-5 py-8 md:px-8">
						<div className="h-full w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(16,16,16,0.82)]">
							<div className="h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
								<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 text-white">
									<div className="space-y-2">
										<p className="text-sm text-white/55">{item.title || "Без названия"}</p>
										<div className={cn("document-content max-w-none text-white", prose)}>
											{hasHtmlContent ? (
												<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
											) : (
												<div className="whitespace-pre-wrap leading-7 text-white/88">{item.content}</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<AnimatePresence initial={false}>
						{controlsVisible && (
							<motion.div
								initial={{ opacity: 0, y: 16 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 16 }}
								transition={{ duration: 0.18 }}
								className="absolute bottom-6 left-6 z-20 flex flex-wrap items-center gap-2">
								<Button
									variant="secondary"
									size="sm"
									onClick={() => setShowDetails((current) => !current)}
									className="h-10 rounded-full border border-white/12 bg-black/55 px-4 text-white hover:bg-black/70">
									<Info className="mr-2 size-4" />
									{showDetails ? "Скрыть" : "Детали"}
								</Button>
								{onEdit && (
									<Button
										variant="secondary"
										size="sm"
										onClick={() => {
											onEdit(item.id);
											onOpenChange(false);
										}}
										className="h-10 rounded-full border border-white/12 bg-black/55 px-4 text-white hover:bg-black/70">
										<Edit2 className="mr-2 size-4" />
										Редактировать
									</Button>
								)}
								{onDelete && (
									<Button
										variant="secondary"
										size="sm"
										onClick={() => setShowDeleteConfirm(true)}
										className="h-10 rounded-full border border-red-400/20 bg-red-500/20 px-4 text-white hover:bg-red-500/30">
										<Trash2 className="mr-2 size-4" />
										Удалить
									</Button>
								)}
							</motion.div>
						)}
					</AnimatePresence>

					<AnimatePresence initial={false}>
						{controlsVisible && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.16 }}
								className="absolute right-6 top-6 z-20">
								<Button
									variant="secondary"
									size="icon"
									onClick={() => onOpenChange(false)}
									className="h-10 w-10 rounded-full border border-white/12 bg-black/55 text-white hover:bg-black/70">
									<X className="size-4" />
								</Button>
							</motion.div>
						)}
					</AnimatePresence>

					<AnimatePresence initial={false}>
						{showDetails && (
							<motion.div
								initial={{ opacity: 0, y: 16 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 16 }}
								transition={{ duration: 0.18 }}
								className="absolute bottom-20 left-6 z-20 w-[min(360px,calc(100vw-48px))] overflow-hidden rounded-3xl border border-white/10 bg-black/78 p-4 text-white">
								<div className="space-y-4">
									<div className="space-y-1">
										<div className="flex items-center gap-2 text-sm text-white/70">
											<FileText className="size-4" />
											<span>{item.type.toUpperCase()}</span>
										</div>
										<p className="text-base font-medium text-white">{item.title || "Без названия"}</p>
									</div>

									<div className="space-y-2 text-sm text-white/65">
										<p>Создано {formatDate(item.created_at)}</p>
										<p>{readingTime}</p>
										{item.updated_at && item.updated_at !== item.created_at && (
											<p>Обновлено {formatDate(item.updated_at)}</p>
										)}
									</div>

									{item.tags.length > 0 && (
										<div className="flex flex-wrap gap-2">
											{item.tags.map((tag) => (
												<span key={tag} className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/80">
													{tag}
												</span>
											))}
										</div>
									)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</BaseModal>

			<ConfirmDialog
				open={showDeleteConfirm}
				onOpenChange={setShowDeleteConfirm}
				title="Удалить документ?"
				description="Это действие нельзя отменить. Документ будет удалён навсегда."
				confirmText="Удалить"
				cancelText="Отмена"
				variant="destructive"
				onConfirm={async () => {
					if (!onDelete) return;
					try {
						await onDelete(item.id);
						showToast.success("Документ удалён");
						onOpenChange(false);
					} catch {
						showToast.error("Ошибка при удалении");
					}
				}}
			/>
		</>
	);
}
