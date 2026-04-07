"use client";

import { Button, ScrollArea } from "@synapse/ui/components";
import { AnimatePresence, motion } from "framer-motion";
import {
	Calendar,
	ChevronLeft,
	ChevronRight,
	Edit2,
	Image as ImageIcon,
	Layers,
	Tag,
	Trash2,
	Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { trpc } from "@/shared/api/trpc";
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

interface MediaViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	gallery?: { url: string; parentId: string; media_type?: string; thumbnail_url?: string }[];
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	onContentChanged?: () => void;
}

export function MediaViewerModal({
	open,
	onOpenChange,
	item,
	gallery = [],
	onEdit,
	onDelete,
	onContentChanged,
}: MediaViewerModalProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState(0);
	const [showTags, setShowTags] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const router = useRouter();

	const imageUrls: string[] = useMemo(() => {
		return gallery.length > 0
			? gallery.map((g) => g.url)
			: (() => {
					const media = parseMediaJson(item.content)?.media;
					return media?.url ? [media.url] : [item.content];
				})();
	}, [gallery, item.content]);

	const isMultiple = imageUrls.length > 1;

	const updateContentMutation = trpc.content.update.useMutation({
		onSuccess: () => onContentChanged?.(),
	});

	const deleteContentMutation = trpc.content.delete.useMutation({
		onSuccess: () => {
			onContentChanged?.();
			onOpenChange(false);
		},
	});

	useEffect(() => {
		if (open) {
			const newIndex = gallery.length > 0 ? gallery.findIndex((g) => g.parentId === item.id) : 0;
			setCurrentIndex(newIndex >= 0 ? newIndex : 0);
			setShowTags(false);
		}
	}, [open, item.id, gallery]);

	const goToNext = () => {
		setDirection(1);
		setCurrentIndex((i) => (i < imageUrls.length - 1 ? i + 1 : i));
	};

	const goToPrevious = () => {
		setDirection(-1);
		setCurrentIndex((i) => (i > 0 ? i - 1 : i));
	};

	useModalKeyboard({
		enabled: open && !showTags,
		onEscape: () => {
			if (showTags) setShowTags(false);
			else onOpenChange(false);
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
		router.push(`/edit/${item.id}`);
		onOpenChange(false);
	};

	const handleDelete = () => {
		setShowDeleteConfirm(true);
	};

	const confirmDelete = async () => {
		try {
			await deleteContentMutation.mutateAsync({ id: item.id });
			showToast.success("Контент удален");
		} catch {
			showToast.error("Ошибка при удалении");
		}
	};

	const handleAddTag = async (tag: string) => {
		try {
			const updatedTags = [...new Set([...(item.tags || []), tag])];
			await updateContentMutation.mutateAsync({
				id: item.id,
				tags: updatedTags,
			});
			showToast.success("Тег добавлен");
		} catch {
			showToast.error("Ошибка при добавлении тега");
		}
	};

	const handleRemoveTag = async (tag: string) => {
		try {
			const updatedTags = item.tags.filter((t) => t !== tag);
			await updateContentMutation.mutateAsync({
				id: item.id,
				tags: updatedTags,
			});
			showToast.success("Тег удален");
		} catch {
			showToast.error("Ошибка при удалении тега");
		}
	};

	const currentMedia = useMemo(() => {
		return gallery && gallery.length > 0
			? gallery[currentIndex]
			: {
					url: item.media_url || imageUrls[currentIndex],
					media_type: item.media_type,
					thumbnail_url: item.thumbnail_url,
				};
	}, [gallery, currentIndex, item.media_url, item.media_type, item.thumbnail_url, imageUrls]);

	const [mediaSrc, setMediaSrc] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		setMediaSrc(null);

		const loadMedia = async () => {
			const url = getPresignedMediaUrl(currentMedia.url);
			if (!cancelled) setMediaSrc(url);
		};

		loadMedia();

		return () => {
			cancelled = true;
		};
	}, [currentMedia.url]);

	const formatDate = (date: string | Date) => {
		return new Date(date).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	};

	return (
		<>
			<BaseModal open={open} onOpenChange={onOpenChange} size="full" className="max-w-[95vw] h-[95vh]">
				<div className="flex flex-col lg:flex-row h-full">
					{/* Media Area */}
					<div className="relative flex-1 bg-muted/30 flex items-center justify-center overflow-hidden">
						<AnimatePresence initial={false} mode="sync" custom={direction}>
							{currentMedia.media_type === "video" ? (
								<motion.div
									key={currentIndex}
									custom={direction}
									variants={modalAnimations.slide as any}
									initial="enter"
									animate="center"
									exit="exit"
									transition={modalAnimations.slide.transition}
									className="absolute inset-0 w-full h-full">
									<CustomVideoPlayer
										src={mediaSrc || ""}
										poster={currentMedia.thumbnail_url}
										autoPlay={true}
										className="w-full h-full"
									/>
								</motion.div>
							) : (
								<motion.img
									key={currentIndex}
									custom={direction}
									variants={modalAnimations.slide as any}
									initial="enter"
									animate="center"
									exit="exit"
									transition={modalAnimations.slide.transition}
									src={mediaSrc || undefined}
									alt={`${item.title || "Image"} ${currentIndex + 1}`}
									className="max-w-full max-h-full object-contain"
									draggable={false}
									{...gestures}
								/>
							)}
						</AnimatePresence>

						{/* Navigation Buttons */}
						{isMultiple && (
							<>
								<button
									onClick={goToPrevious}
									disabled={currentIndex === 0}
									className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-background/90 hover:bg-background border border-border shadow-lg rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10">
									<ChevronLeft className="w-5 h-5" />
								</button>
								<button
									onClick={goToNext}
									disabled={currentIndex === imageUrls.length - 1}
									className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-background/90 hover:bg-background border border-border shadow-lg rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed z-10">
									<ChevronRight className="w-5 h-5" />
								</button>
							</>
						)}

						{/* Counter Badge */}
						{isMultiple && (
							<div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border border-border px-3 py-1.5 rounded-full text-sm font-medium shadow-lg">
								<span className="text-foreground">
									{currentIndex + 1} / {imageUrls.length}
								</span>
							</div>
						)}
					</div>

					{/* Info Sidebar */}
					<div className="w-full lg:w-[380px] flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-background">
						<ScrollArea className="flex-1">
							<div className="p-6 space-y-6">
								{/* Header with Type */}
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									{currentMedia.media_type === "video" ? (
										<>
											<Video className="w-4 h-4" />
											<span>Видео</span>
										</>
									) : (
										<>
											<ImageIcon className="w-4 h-4" />
											<span>Изображение</span>
										</>
									)}
									{isMultiple && (
										<>
											<span className="text-muted-foreground/50">•</span>
											<Layers className="w-4 h-4" />
											<span>Группа</span>
										</>
									)}
								</div>

								{/* Title */}
								{item.title && (
									<div>
										<h2 className="text-2xl font-semibold text-foreground leading-tight">{item.title}</h2>
									</div>
								)}

								{/* Date */}
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar className="w-4 h-4" />
									<span>{formatDate(item.created_at)}</span>
								</div>

								{/* Tags Section */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-medium text-foreground">Теги</h3>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setShowTags(!showTags)}
											className="h-auto py-1 px-2">
											<Tag className="w-3 h-3 mr-1" />
											{showTags ? "Скрыть" : "Управление"}
										</Button>
									</div>

									{showTags ? (
										<TagManager
											tags={item.tags}
											onAddTag={handleAddTag}
											onRemoveTag={handleRemoveTag}
											inputPlaceholder="Добавить тег..."
										/>
									) : item.tags.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{item.tags.map((tag) => (
												<span key={tag} className="px-2.5 py-1 bg-muted rounded-md text-sm text-foreground">
													{tag}
												</span>
											))}
										</div>
									) : (
										<p className="text-sm text-muted-foreground italic">Теги не добавлены</p>
									)}
								</div>

								{/* Metadata */}
								{item.updated_at && item.updated_at !== item.created_at && (
									<div className="pt-4 border-t border-border">
										<p className="text-xs text-muted-foreground">Обновлено {formatDate(item.updated_at)}</p>
									</div>
								)}
							</div>
						</ScrollArea>

						{/* Actions Footer */}
						<div className="p-4 border-t border-border bg-muted/30">
							<div className="flex gap-2">
								{onEdit && (
									<Button variant="outline" className="flex-1" onClick={handleEdit}>
										<Edit2 className="w-4 h-4 mr-2" />
										Редактировать
									</Button>
								)}
								{onDelete && (
									<Button variant="destructive" onClick={handleDelete}>
										<Trash2 className="w-4 h-4" />
									</Button>
								)}
							</div>
						</div>
					</div>
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
