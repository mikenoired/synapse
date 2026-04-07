"use client";

import { Button } from "@synapse/ui/components";
import { AnimatePresence, motion } from "framer-motion";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Download,
	Edit2,
	Image as ImageIcon,
	Info,
	Tag,
	Trash2,
	Video,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { trpc } from "@/shared/api/trpc";
import useMouseActivity from "@/shared/hooks/use-mouse-activity";
import { getPresignedMediaUrl } from "@/shared/lib/image-utils";
import type { Content } from "@/shared/lib/schemas";
import { parseMediaJson } from "@/shared/lib/schemas";
import { modalAnimations } from "@/shared/ui/design-tokens";
import { CustomVideoPlayer } from "@/widgets/content-viewer/ui/custom-video-player";

import { BaseModal } from "../base";
import { TagManager } from "../components";
import { ConfirmDialog } from "../dialogs";
import { useModalGestures, useModalKeyboard } from "../hooks";
import { showToast } from "../utils";

interface GalleryEntry {
	item?: Content;
	media_type?: string;
	parentId: string;
	thumbnail_url?: string;
	url: string;
}

interface MediaViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	gallery?: GalleryEntry[];
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void | Promise<void>;
	onContentUpdated?: (content: Content) => void;
}

function formatDate(date: string | Date) {
	return new Date(date).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function getDownloadFileName(item: Content, mediaPath: string) {
	const extension = mediaPath.split("?")[0]?.split(".").pop()?.trim();
	const safeTitle = (item.title || item.id).trim().replace(/[^a-zA-Z0-9-_]+/g, "-");

	if (!extension) {
		return safeTitle;
	}

	return `${safeTitle}.${extension}`;
}

export function MediaViewerModal({
	open,
	onOpenChange,
	item,
	gallery = [],
	onEdit,
	onDelete,
	onContentUpdated,
}: MediaViewerModalProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState(0);
	const [showDetails, setShowDetails] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [updatedItemsById, setUpdatedItemsById] = useState<Record<string, Content>>({});
	const router = useRouter();
	const utils = trpc.useUtils();
	const { bind, isHovered } = useMouseActivity(1800);

	const galleryEntries = useMemo<GalleryEntry[]>(() => {
		if (gallery.length > 0) {
			return gallery;
		}

		return [
			{
				item,
				parentId: item.id,
				media_type: item.media_type,
				thumbnail_url: item.thumbnail_url,
				url: item.media_url || parseMediaJson(item.content)?.media?.url || item.content,
			},
		];
	}, [gallery, item]);

	const currentEntry = galleryEntries[currentIndex] ?? galleryEntries[0];
	const activeItem = useMemo(() => {
		const fallbackItem = currentEntry?.item ?? item;
		return updatedItemsById[fallbackItem.id] ?? fallbackItem;
	}, [currentEntry?.item, item, updatedItemsById]);

	const isMultiple = galleryEntries.length > 1;
	const mediaSrc = useMemo(() => getPresignedMediaUrl(currentEntry?.url || ""), [currentEntry?.url]);
	const backgroundSrc = useMemo(() => {
		if (currentEntry?.media_type === "video") {
			return currentEntry.thumbnail_url ? getPresignedMediaUrl(currentEntry.thumbnail_url) : "";
		}

		return mediaSrc;
	}, [currentEntry?.media_type, currentEntry?.thumbnail_url, mediaSrc]);

	useEffect(() => {
		setUpdatedItemsById({});
	}, [item.id]);

	useEffect(() => {
		if (!open) {
			setShowDetails(false);
			return;
		}

		const nextIndex = galleryEntries.findIndex((entry) => entry.parentId === item.id);
		setCurrentIndex(nextIndex >= 0 ? nextIndex : 0);
		setShowDetails(false);
	}, [galleryEntries, item.id, open]);

	const updateContentMutation = trpc.content.update.useMutation({
		onSuccess: (updatedContent) => {
			setUpdatedItemsById((current) => ({
				...current,
				[updatedContent.id]: updatedContent,
			}));
			void Promise.all([
				utils.content.getTags.invalidate(),
				utils.content.getTagsWithContent.invalidate(),
				utils.graph.getGraph.invalidate(),
				utils.user.getStorageUsage.invalidate(),
			]);
			onContentUpdated?.(updatedContent);
		},
	});

	const deleteContentMutation = trpc.content.delete.useMutation({
		onSuccess: () => {
			void Promise.all([
				utils.content.getTags.invalidate(),
				utils.content.getTagsWithContent.invalidate(),
				utils.graph.getGraph.invalidate(),
				utils.user.getStorageUsage.invalidate(),
			]);
			onOpenChange(false);
		},
	});

	const goToNext = () => {
		setDirection(1);
		setCurrentIndex((index) => (index < galleryEntries.length - 1 ? index + 1 : index));
	};

	const goToPrevious = () => {
		setDirection(-1);
		setCurrentIndex((index) => (index > 0 ? index - 1 : index));
	};

	useModalKeyboard({
		enabled: open && !showDetails,
		onEscape: () => {
			if (showDetails) {
				setShowDetails(false);
				return;
			}

			onOpenChange(false);
		},
		shortcuts: [
			{ key: "ArrowLeft", handler: goToPrevious, preventDefault: true },
			{ key: "ArrowRight", handler: goToNext, preventDefault: true },
		],
	});

	const gestures = useModalGestures({
		enabled: open && isMultiple,
		swipe: {
			direction: "horizontal",
			threshold: 50,
			onSwipeLeft: goToNext,
			onSwipeRight: goToPrevious,
		},
	});

	const handleEdit = () => {
		if (onEdit) {
			onEdit(activeItem.id);
		} else {
			router.push(`/edit/${activeItem.id}`);
		}

		onOpenChange(false);
	};

	const handleDelete = () => {
		setShowDeleteConfirm(true);
	};

	const confirmDelete = async () => {
		try {
			if (onDelete) {
				await onDelete(activeItem.id);
				onOpenChange(false);
				showToast.success("Контент удален");
				return;
			}

			await deleteContentMutation.mutateAsync({ id: activeItem.id });
			showToast.success("Контент удален");
		} catch {
			showToast.error("Ошибка при удалении");
		}
	};

	const handleAddTag = async (tag: string) => {
		try {
			const updatedTags = [...new Set([...(activeItem.tags || []), tag])];
			await updateContentMutation.mutateAsync({
				id: activeItem.id,
				tags: updatedTags,
			});
			showToast.success("Тег добавлен");
		} catch {
			showToast.error("Ошибка при добавлении тега");
		}
	};

	const handleRemoveTag = async (tag: string) => {
		try {
			const updatedTags = activeItem.tags.filter((value) => value !== tag);
			await updateContentMutation.mutateAsync({
				id: activeItem.id,
				tags: updatedTags,
			});
			showToast.success("Тег удален");
		} catch {
			showToast.error("Ошибка при удалении тега");
		}
	};

	const handleDownload = async () => {
		if (!mediaSrc) {
			return;
		}

		setIsDownloading(true);

		try {
			const response = await fetch(mediaSrc);
			if (!response.ok) {
				throw new Error("Download failed");
			}

			const blob = await response.blob();
			const objectUrl = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = objectUrl;
			link.download = getDownloadFileName(activeItem, currentEntry.url);
			document.body.append(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(objectUrl);
		} catch {
			showToast.error("Не удалось скачать файл");
		} finally {
			setIsDownloading(false);
		}
	};

	const controlsVisible = isHovered;

	return (
		<>
			<BaseModal
				open={open}
				onOpenChange={onOpenChange}
				size="full"
				variant="fullscreen"
				className="border-0 bg-black/35 shadow-none backdrop-blur-xl"
				preventScroll>
				<div className="relative h-full w-full overflow-hidden bg-black" {...bind}>
					{backgroundSrc && (
						<div className="absolute inset-0 overflow-hidden">
							<img
								src={backgroundSrc}
								alt=""
								className="h-full w-full scale-110 object-cover opacity-30 blur-3xl"
								draggable={false}
							/>
							<div className="absolute inset-0 bg-black/55" />
						</div>
					)}

					<AnimatePresence initial={false} mode="sync" custom={direction}>
						{currentEntry.media_type === "video" ? (
							<motion.div
								key={currentEntry.parentId}
								custom={direction}
								variants={modalAnimations.slide as any}
								initial="enter"
								animate="center"
								exit="exit"
								transition={modalAnimations.slide.transition}
								className="absolute inset-0 h-full w-full">
								<CustomVideoPlayer
									src={mediaSrc}
									poster={currentEntry.thumbnail_url}
									autoPlay={true}
									className="h-full w-full"
								/>
							</motion.div>
						) : (
							<motion.img
								key={currentEntry.parentId}
								custom={direction}
								variants={modalAnimations.slide as any}
								initial="enter"
								animate="center"
								exit="exit"
								transition={modalAnimations.slide.transition}
								src={mediaSrc}
								alt={activeItem.title || "media"}
								className="absolute inset-0 h-full w-full object-contain"
								draggable={false}
								{...gestures}
							/>
						)}
					</AnimatePresence>

					<AnimatePresence initial={false}>
						{controlsVisible && isMultiple && (
							<>
								<motion.button
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.16 }}
									onClick={goToPrevious}
									disabled={currentIndex === 0}
									className="absolute left-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/55 text-white transition-colors hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-30">
									<ChevronLeft className="size-5" />
								</motion.button>
								<motion.button
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.16 }}
									onClick={goToNext}
									disabled={currentIndex === galleryEntries.length - 1}
									className="absolute right-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/55 text-white transition-colors hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-30">
									<ChevronRight className="size-5" />
								</motion.button>
							</>
						)}
					</AnimatePresence>

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
								<Button
									variant="secondary"
									size="sm"
									onClick={handleDownload}
									disabled={isDownloading || !mediaSrc}
									className="h-10 rounded-full border border-white/12 bg-black/55 px-4 text-white hover:bg-black/70">
									<Download className="mr-2 size-4" />
									{isDownloading ? "Скачивание..." : "Скачать"}
								</Button>
								{onEdit && (
									<Button
										variant="secondary"
										size="sm"
										onClick={handleEdit}
										className="h-10 rounded-full border border-white/12 bg-black/55 px-4 text-white hover:bg-black/70">
										<Edit2 className="mr-2 size-4" />
										Редактировать
									</Button>
								)}
								{onDelete && (
									<Button
										variant="secondary"
										size="sm"
										onClick={handleDelete}
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
								<div className="mb-4 flex items-start justify-between gap-3">
									<div className="min-w-0 space-y-2">
										<div className="flex flex-wrap items-center gap-2 text-xs text-white/65">
											<span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1">
												{currentEntry.media_type === "video" ? (
													<Video className="size-3.5" />
												) : (
													<ImageIcon className="size-3.5" />
												)}
												{currentEntry.media_type === "video" ? "Видео" : "Изображение"}
											</span>
											<span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1">
												<Calendar className="size-3.5" />
												{formatDate(activeItem.created_at)}
											</span>
										</div>
										<p className="text-base font-medium leading-6 text-white">
											{activeItem.title || "Без названия"}
										</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setShowDetails(false)}
										className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white">
										<X className="size-4" />
									</Button>
								</div>

								<div className="space-y-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-white/45">
											<Tag className="size-3.5" />
											Теги
										</div>
										<TagManager
											tags={activeItem.tags}
											onAddTag={handleAddTag}
											onRemoveTag={handleRemoveTag}
											inputPlaceholder="Добавить тег..."
										/>
									</div>

									{activeItem.updated_at && activeItem.updated_at !== activeItem.created_at && (
										<p className="text-xs text-white/45">Обновлено {formatDate(activeItem.updated_at)}</p>
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
				title="Удалить медиа?"
				description="Это действие нельзя отменить. Медиафайл будет удален навсегда."
				confirmText="Удалить"
				cancelText="Отмена"
				variant="destructive"
				onConfirm={confirmDelete}
			/>
		</>
	);
}
