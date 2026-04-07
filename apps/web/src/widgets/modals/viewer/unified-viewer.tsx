"use client";

import { cn } from "@synapse/ui/cn";
import { prose } from "@synapse/ui/prose";
import DOMPurify from "dompurify";
import { AnimatePresence, motion } from "framer-motion";
import {
	Calendar,
	Download,
	Edit2,
	FileText,
	Globe,
	Image as ImageIcon,
	Info,
	ListChecks,
	Pause,
	Play,
	Tag,
	Trash2,
	User,
	Volume2,
	VolumeX,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { trpc } from "@/shared/api/trpc";
import useMouseActivity from "@/shared/hooks/use-mouse-activity";
import { getPresignedMediaUrl } from "@/shared/lib/image-utils";
import type { Content, LinkContent } from "@/shared/lib/schemas";
import {
	calculateReadingTime,
	calculateReadingTimeFromLinkContent,
	parseAudioJson,
	parseLinkContent,
	parseMediaJson,
} from "@/shared/lib/schemas";
import { useUserPreferences } from "@/shared/lib/user-preferences-context";
import { CustomVideoPlayer } from "@/widgets/content-viewer/ui/custom-video-player";
import { EditorRenderer } from "@/widgets/editor/ui/editor-renderer";

import { BaseModal } from "../base";
import { ConfirmDialog } from "../dialogs";
import { useModalGestures, useModalKeyboard } from "../hooks";
import { showToast } from "../utils";
import { TagManager, ViewerOverlayControls, type ViewerOverlayAction } from "../components";

interface UnifiedViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	items?: Content[];
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void | Promise<void>;
	onContentUpdated?: (content: Content) => void;
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

function formatDuration(seconds: number) {
	const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
	const minutes = Math.floor(safeSeconds / 60);
	const remainder = Math.floor(safeSeconds % 60);
	return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function buildDownloadName(item: Content, url: string) {
	const extension = url.split("?")[0]?.split(".").pop()?.trim();
	const safeTitle = (item.title || item.id).trim().replace(/[^a-zA-Z0-9-_]+/g, "-");
	return extension ? `${safeTitle}.${extension}` : safeTitle;
}

function isDocumentType(type: Content["type"]) {
	return ["doc", "pdf", "docx", "epub", "xlsx", "csv"].includes(type);
}

function getReadingTime(item: Content, linkContent: LinkContent | null) {
	if (item.type === "link" && linkContent) {
		return calculateReadingTimeFromLinkContent(linkContent);
	}

	if (item.type === "audio") {
		const audio = parseAudioJson(item.content);
		const duration = audio?.audio.durationSec;
		if (!duration) return undefined;
		return `${Math.max(1, Math.ceil(duration / 60))} мин`;
	}

	if (item.type === "note" || item.type === "todo" || isDocumentType(item.type)) {
		return calculateReadingTime(item.content);
	}

	return undefined;
}

function StructuredContentRenderer({ content }: { content: LinkContent["content"] }) {
	return (
		<article className={cn("max-w-none", prose)}>
			{content.content.map((block, index) => {
				if (block.type === "heading") {
					const level = Math.min(block.attrs?.level || 1, 6);
					if (level === 1) return <h1 key={index} className="mb-4 mt-6 text-3xl font-semibold text-foreground first:mt-0">{block.content}</h1>;
					if (level === 2) return <h2 key={index} className="mb-4 mt-6 text-2xl font-semibold text-foreground first:mt-0">{block.content}</h2>;
					if (level === 3) return <h3 key={index} className="mb-4 mt-6 text-xl font-semibold text-foreground first:mt-0">{block.content}</h3>;
					if (level === 4) return <h4 key={index} className="mb-4 mt-6 text-lg font-semibold text-foreground first:mt-0">{block.content}</h4>;
					if (level === 5) return <h5 key={index} className="mb-4 mt-6 text-base font-semibold text-foreground first:mt-0">{block.content}</h5>;
					return <h6 key={index} className="mb-4 mt-6 text-sm font-semibold text-foreground first:mt-0">{block.content}</h6>;
				}

				if (block.type === "paragraph") {
					return (
						<p key={index} className="mb-4 leading-7 text-foreground/90">
							{block.content}
						</p>
					);
				}

				if (block.type === "quote") {
					return (
						<blockquote key={index} className="my-5 rounded-r-md border-l-4 border-primary bg-muted/40 px-4 py-3">
							<p className="mb-0 italic text-foreground/80">{block.content}</p>
						</blockquote>
					);
				}

				if (block.type === "code") {
					return (
						<pre key={index} className="my-5 overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm">
							<code>{block.content}</code>
						</pre>
					);
				}

				if (block.type === "image" && block.attrs?.src) {
					return (
						<figure key={index} className="my-6 space-y-2">
							<img src={block.attrs.src} alt={block.attrs.alt || ""} className="w-full rounded-xl border border-border object-cover" />
						</figure>
					);
				}

				if (block.type === "list") {
					const items = block.content?.split("\n").filter(Boolean) ?? [];
					const ListTag = block.attrs?.listType === "ordered" ? "ol" : "ul";
					return (
						<ListTag key={index} className="my-4 list-inside space-y-2 pl-2">
							{items.map((value, itemIndex) => (
								<li key={itemIndex}>{value.trim()}</li>
							))}
						</ListTag>
					);
				}

				if (block.type === "divider") {
					return <hr key={index} className="my-8 border-border" />;
				}

				return null;
			})}
		</article>
	);
}

function TodoRenderer({ content }: { content: string }) {
	const todos = useMemo(() => {
		try {
			return JSON.parse(content) as Array<{ marked: boolean; text: string }>;
		} catch {
			return [];
		}
	}, [content]);

	if (todos.length === 0) {
		return <p className="text-sm text-muted-foreground">Нет задач</p>;
	}

	return (
		<div className="flex flex-col gap-3">
			{todos.map((todo, index) => (
				<div key={`${todo.text}-${index}`} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
					<input type="checkbox" checked={todo.marked} readOnly className="mt-0.5 h-4 w-4 rounded border-border" />
					<span className={cn("leading-6 text-foreground", todo.marked && "line-through opacity-60")}>{todo.text}</span>
				</div>
			))}
		</div>
	);
}

function NoteRenderer({ item }: { item: Content }) {
	const parsed = useMemo(() => {
		if (item.type !== "note") return null;
		try {
			return JSON.parse(item.content);
		} catch {
			return null;
		}
	}, [item.content, item.type]);

	if (parsed?.type === "doc") {
		return <EditorRenderer data={parsed} />;
	}

	return <pre className="whitespace-pre-wrap font-sans leading-7 text-foreground/90">{item.content}</pre>;
}

function LinkRenderer({ item, linkContent }: { item: Content; linkContent: LinkContent | null }) {
	if (!linkContent) {
		return (
			<div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
				<p className="rounded-xl bg-muted/50 p-3 font-mono text-sm break-all">{item.content}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
				<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
					<Globe className="size-4" />
					<span className="truncate max-w-[220px]">{new URL(linkContent.url).hostname}</span>
				</div>
				{linkContent.metadata.author && (
					<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
						<User className="size-4" />
						<span className="truncate max-w-[220px]">{linkContent.metadata.author}</span>
					</div>
				)}
			</div>

			{linkContent.metadata.image && (
				<img src={linkContent.metadata.image} alt={linkContent.title} className="h-64 w-full rounded-2xl border border-border object-cover md:h-80" />
			)}

			<StructuredContentRenderer content={linkContent.content} />
		</div>
	);
}

function DocumentRenderer({ item }: { item: Content }) {
	const hasHtml = useMemo(() => /<[^>]+>/g.test(item.content), [item.content]);
	const sanitized = useMemo(() => {
		if (!hasHtml) return "";
		return DOMPurify.sanitize(item.content, {
			ADD_TAGS: ["img", "table", "thead", "tbody", "tr", "td", "th"],
			ADD_ATTR: ["src", "alt", "title", "class", "style", "colspan", "rowspan"],
			ALLOW_DATA_ATTR: false,
		});
	}, [hasHtml, item.content]);

	return (
		<div className="space-y-6">
			{item.thumbnail_base64 && (
				<div className="overflow-hidden rounded-2xl border border-border bg-muted/20 p-3">
					<img src={ensureDataUri(item.thumbnail_base64)} alt="Document preview" className="mx-auto w-full max-w-2xl rounded-xl object-cover" />
				</div>
			)}

			<div className={cn("document-content max-w-none", prose)}>
				{hasHtml ? <div dangerouslySetInnerHTML={{ __html: sanitized }} /> : <div className="whitespace-pre-wrap leading-7 text-foreground/90">{item.content}</div>}
			</div>
		</div>
	);
}

const viewerSlideVariants = {
	enter: (direction: number) => ({
		opacity: direction === 0 ? 1 : 0,
		scale: direction === 0 ? 1 : 0.985,
		x: direction > 0 ? 88 : direction < 0 ? -88 : 0,
	}),
	center: {
		opacity: 1,
		scale: 1,
		x: 0,
	},
	exit: (direction: number) => ({
		opacity: 0,
		scale: 0.985,
		x: direction > 0 ? -88 : 88,
	}),
};

const viewerSlideTransition = {
	x: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
	opacity: { duration: 0.18, ease: "easeOut" },
	scale: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
} as const;

export function UnifiedViewerModal({
	open,
	onOpenChange,
	item,
	items = [],
	onEdit,
	onDelete,
	onContentUpdated,
}: UnifiedViewerModalProps) {
	const router = useRouter();
	const utils = trpc.useUtils();
	const [currentIndex, setCurrentIndex] = useState(0);
	const [direction, setDirection] = useState(0);
	const [showDetails, setShowDetails] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [updatedItems, setUpdatedItems] = useState<Record<string, Content>>({});
	const [isDownloading, setIsDownloading] = useState(false);
	const [audioState, setAudioState] = useState({ currentTime: 0, duration: 0, isPlaying: false, muted: false, seeking: false, seekValue: 0, volume: 1 });
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const { bind, isHovered } = useMouseActivity(1800);
	const { isReady: preferencesReady, mediaAutoplayEnabled } = useUserPreferences();

	const normalizedItems = useMemo(() => {
		const source = items.length > 0 ? items : [item];
		return source.filter(Boolean);
	}, [item, items]);

	const currentBaseItem = normalizedItems[currentIndex] ?? item;
	const currentItem = updatedItems[currentBaseItem.id] ?? currentBaseItem;
	const linkContent = useMemo(() => (currentItem.type === "link" ? parseLinkContent(currentItem.content) : null), [currentItem.content, currentItem.type]);
	const readingTime = useMemo(() => getReadingTime(currentItem, linkContent), [currentItem, linkContent]);
	const mediaData = useMemo(() => (currentItem.type === "media" ? parseMediaJson(currentItem.content)?.media ?? null : null), [currentItem.content, currentItem.type]);
	const audioData = useMemo(() => (currentItem.type === "audio" ? parseAudioJson(currentItem.content) : null), [currentItem.content, currentItem.type]);
	const mediaUrl = mediaData?.url ? getPresignedMediaUrl(mediaData.url) : "";
	const videoPosterUrl = mediaData?.thumbnailUrl ? getPresignedMediaUrl(mediaData.thumbnailUrl) : undefined;
	const audioUrl = audioData?.audio?.url ? getPresignedMediaUrl(audioData.audio.url) : "";
	const coverUrl = audioData?.cover?.url ? getPresignedMediaUrl(audioData.cover.url) : "";

	const backgroundSrc = useMemo(() => {
		if (currentItem.type === "media") {
			if (mediaData?.type === "video" && mediaData.thumbnailUrl) return getPresignedMediaUrl(mediaData.thumbnailUrl);
			return mediaUrl;
		}

		if (currentItem.type === "audio") {
			return coverUrl;
		}

		if (isDocumentType(currentItem.type) && currentItem.thumbnail_base64) {
			return ensureDataUri(currentItem.thumbnail_base64);
		}

		if (currentItem.type === "link" && linkContent?.metadata.image) {
			return linkContent.metadata.image;
		}

		return "";
	}, [coverUrl, currentItem.thumbnail_base64, currentItem.type, linkContent?.metadata.image, mediaData?.thumbnailUrl, mediaData?.type, mediaUrl]);

	const downloadUrl = currentItem.type === "media" ? mediaUrl : currentItem.type === "audio" ? audioUrl : "";

	useEffect(() => {
		setUpdatedItems({});
	}, [item.id]);

	useEffect(() => {
		if (!open) {
			setShowDetails(false);
			setDirection(0);
			return;
		}

		const nextIndex = normalizedItems.findIndex((entry) => entry.id === item.id);
		setCurrentIndex(nextIndex >= 0 ? nextIndex : 0);
		setDirection(0);
		setShowDetails(false);
	}, [item.id, normalizedItems, open]);

	useEffect(() => {
		if (currentItem.type !== "audio" || !audioRef.current) {
			return;
		}

		audioRef.current.muted = audioState.muted;
		audioRef.current.volume = audioState.volume;
	}, [audioState.muted, audioState.volume, currentItem.type]);

	useEffect(() => {
		const element = audioRef.current;
		if (element) {
			element.pause();
		}

		if (currentItem.type !== "audio") {
			setAudioState({ currentTime: 0, duration: 0, isPlaying: false, muted: false, seeking: false, seekValue: 0, volume: 1 });
		}
	}, [currentItem.id, currentItem.type]);

	useEffect(() => {
		const element = audioRef.current;
		if (!element || currentItem.type !== "audio") return;

		const handleLoaded = () => {
			setAudioState((current) => ({ ...current, duration: element.duration || 0, currentTime: element.currentTime || 0 }));

			if (!preferencesReady || !mediaAutoplayEnabled || element.currentTime > 0) {
				setAudioState((current) => ({ ...current, isPlaying: false }));
				return;
			}

			element.play().then(() => {
				setAudioState((current) => ({ ...current, isPlaying: true }));
			}).catch(() => {
				setAudioState((current) => ({ ...current, isPlaying: false }));
			});
		};

		const handleTimeUpdate = () => {
			setAudioState((current) => (current.seeking ? current : { ...current, currentTime: element.currentTime }));
		};

		const handleEnded = () => {
			setAudioState((current) => ({ ...current, isPlaying: false }));
		};

		const handlePause = () => {
			setAudioState((current) => ({ ...current, isPlaying: false }));
		};

		element.addEventListener("loadedmetadata", handleLoaded);
		element.addEventListener("timeupdate", handleTimeUpdate);
		element.addEventListener("ended", handleEnded);
		element.addEventListener("pause", handlePause);

		if (element.readyState >= 1) {
			handleLoaded();
		}

		return () => {
			element.removeEventListener("loadedmetadata", handleLoaded);
			element.removeEventListener("timeupdate", handleTimeUpdate);
			element.removeEventListener("ended", handleEnded);
			element.removeEventListener("pause", handlePause);
		};
	}, [audioUrl, currentItem.type, mediaAutoplayEnabled, preferencesReady]);

	const updateContentMutation = trpc.content.update.useMutation({
		onSuccess: (updatedContent) => {
			setUpdatedItems((current) => ({ ...current, [updatedContent.id]: updatedContent }));
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

	const goToIndex = (nextIndex: number) => {
		if (nextIndex < 0 || nextIndex >= normalizedItems.length || nextIndex === currentIndex) {
			return;
		}

		setDirection(nextIndex > currentIndex ? 1 : -1);
		setCurrentIndex(nextIndex);
		setShowDetails(false);
	};

	const goToNext = () => {
		goToIndex(currentIndex + 1);
	};

	const goToPrevious = () => {
		goToIndex(currentIndex - 1);
	};

	useModalKeyboard({
		enabled: open,
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
			{
				key: " ",
				handler: () => {
					if (currentItem.type !== "audio") return;
					toggleAudio();
				},
				preventDefault: currentItem.type === "audio",
			},
		],
	});

	const gestures = useModalGestures({
		enabled: open && normalizedItems.length > 1,
		swipe: {
			direction: "horizontal",
			threshold: 50,
			onSwipeLeft: goToNext,
			onSwipeRight: goToPrevious,
		},
	});

	const handleAddTag = async (tag: string) => {
		try {
			const updatedTags = [...new Set([...(currentItem.tags || []), tag])];
			await updateContentMutation.mutateAsync({ id: currentItem.id, tags: updatedTags });
			showToast.success("Тег добавлен");
		} catch {
			showToast.error("Ошибка при добавлении тега");
		}
	};

	const handleRemoveTag = async (tag: string) => {
		try {
			const updatedTags = currentItem.tags.filter((value) => value !== tag);
			await updateContentMutation.mutateAsync({ id: currentItem.id, tags: updatedTags });
			showToast.success("Тег удален");
		} catch {
			showToast.error("Ошибка при удалении тега");
		}
	};

	const handleEdit = () => {
		if (onEdit) {
			onEdit(currentItem.id);
		} else {
			router.push(`/edit/${currentItem.id}`);
		}
		onOpenChange(false);
	};

	const handleDownload = async () => {
		if (!downloadUrl) return;
		setIsDownloading(true);
		try {
			const response = await fetch(downloadUrl);
			if (!response.ok) throw new Error("Download failed");
			const blob = await response.blob();
			const objectUrl = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = objectUrl;
			link.download = buildDownloadName(currentItem, downloadUrl);
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

	const confirmDelete = async () => {
		try {
			if (onDelete) {
				await onDelete(currentItem.id);
				onOpenChange(false);
				showToast.success("Контент удален");
				return;
			}
			await deleteContentMutation.mutateAsync({ id: currentItem.id });
			showToast.success("Контент удален");
		} catch {
			showToast.error("Ошибка при удалении");
		}
	};

	const toggleAudio = () => {
		const element = audioRef.current;
		if (!element || currentItem.type !== "audio") return;
		if (audioState.isPlaying) {
			element.pause();
			setAudioState((current) => ({ ...current, isPlaying: false }));
			return;
		}
		element.play().then(() => {
			setAudioState((current) => ({ ...current, isPlaying: true }));
		}).catch(() => {
			setAudioState((current) => ({ ...current, isPlaying: false }));
		});
	};

	const overlayActions = useMemo<ViewerOverlayAction[]>(() => {
		const actions: ViewerOverlayAction[] = [
			{ icon: Info, label: showDetails ? "Скрыть" : "Детали", onClick: () => setShowDetails((current) => !current) },
		];
		if (downloadUrl) {
			actions.push({ icon: Download, label: isDownloading ? "Скачивание..." : "Скачать", onClick: handleDownload, disabled: isDownloading });
		}
		if (onEdit) {
			actions.push({ icon: Edit2, label: "Редактировать", onClick: handleEdit });
		}
		if (onDelete) {
			actions.push({ icon: Trash2, label: "Удалить", onClick: () => setShowDeleteConfirm(true), destructive: true });
		}
		return actions;
	}, [downloadUrl, handleDownload, isDownloading, onDelete, onEdit, showDetails]);

	const renderContent = () => {
		if (currentItem.type === "media") {
			if (mediaData?.type === "video") {
				return <CustomVideoPlayer src={mediaUrl} poster={videoPosterUrl} autoPlay={preferencesReady && mediaAutoplayEnabled} className="h-full w-full" />;
			}
			return <img src={mediaUrl} alt={currentItem.title || "media"} className="max-h-full max-w-full object-contain" draggable={false} />;
		}

		if (currentItem.type === "audio") {
			const progress = audioState.duration > 0 ? (audioState.currentTime / audioState.duration) * 100 : 0;
			return (
				<div className="flex w-full max-w-[min(88vw,720px)] flex-col items-center gap-6 rounded-[32px] border border-white/10 bg-[rgba(18,18,18,0.58)] px-5 py-6 sm:px-7 sm:py-8">
					<audio ref={audioRef} src={audioUrl} className="hidden" />
					<div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-[28px] border border-white/10 bg-white/5 sm:max-w-[360px]">
						{coverUrl ? (
							<>
								<Image src={coverUrl} alt={audioData?.track?.title || currentItem.title || "cover"} fill unoptimized className="absolute inset-0 scale-105 object-cover opacity-35 blur-2xl" />
								<Image src={coverUrl} alt={audioData?.track?.title || currentItem.title || "cover"} fill unoptimized className="relative z-10 object-cover" />
							</>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-white/5 text-sm text-white/50">Нет обложки</div>
						)}
					</div>

					<div className="space-y-1 text-center text-white">
						<p className="text-xl font-medium leading-tight">{audioData?.track?.title || currentItem.title || "Аудио"}</p>
						{(audioData?.track?.artist || audioData?.track?.album) && <p className="text-sm text-white/60">{[audioData?.track?.artist, audioData?.track?.album].filter(Boolean).join(" • ")}</p>}
					</div>

					<div className="w-full max-w-[560px] rounded-[28px] border border-white/10 bg-black/48 px-4 py-4 text-white sm:px-5">
						<div className="flex flex-col gap-4">
							<div className="flex items-center justify-center">
								<button type="button" onClick={toggleAudio} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-white/90">
									{audioState.isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
								</button>
							</div>
							<div className="flex items-center gap-3">
								<div className="w-11 text-right text-xs tabular-nums text-white/60">{formatDuration(audioState.currentTime)}</div>
								<input
									type="range"
									min={0}
									max={100}
									value={audioState.seeking ? audioState.seekValue : progress}
									onMouseDown={() => setAudioState((current) => ({ ...current, seeking: true }))}
									onTouchStart={() => setAudioState((current) => ({ ...current, seeking: true }))}
									onChange={(e) => setAudioState((current) => ({ ...current, seekValue: Number(e.target.value) }))}
									onMouseUp={() => {
										if (!audioRef.current) return;
										const next = (audioState.seekValue / 100) * (audioState.duration || 0);
										audioRef.current.currentTime = Number.isFinite(next) ? next : 0;
										setAudioState((current) => ({ ...current, currentTime: audioRef.current?.currentTime || 0, seeking: false }));
									}}
									onTouchEnd={() => {
										if (!audioRef.current) return;
										const next = (audioState.seekValue / 100) * (audioState.duration || 0);
										audioRef.current.currentTime = Number.isFinite(next) ? next : 0;
										setAudioState((current) => ({ ...current, currentTime: audioRef.current?.currentTime || 0, seeking: false }));
									}}
									className="flex-1 cursor-pointer"
								/>
								<div className="w-11 text-xs tabular-nums text-white/60">{formatDuration(audioState.duration)}</div>
							</div>
							<div className="flex items-center justify-center gap-3">
								<button
									type="button"
									onClick={() => setAudioState((current) => ({ ...current, muted: !current.muted }))}
									className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
									{audioState.muted || audioState.volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
								</button>
								<input type="range" min={0} max={1} step={0.01} value={audioState.muted ? 0 : audioState.volume} onChange={(e) => setAudioState((current) => ({ ...current, volume: Number(e.target.value) }))} className="w-32 cursor-pointer" />
							</div>
						</div>
					</div>
				</div>
			);
		}

		if (currentItem.type === "note") {
			return (
				<div className="h-full w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(16,16,16,0.82)]">
					<div className="h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
						<div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-5 sm:p-6">
							<NoteRenderer item={currentItem} />
						</div>
					</div>
				</div>
			);
		}

		if (currentItem.type === "todo") {
			return (
				<div className="h-full w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(16,16,16,0.82)]">
					<div className="h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
						<div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-5 sm:p-6">
							<TodoRenderer content={currentItem.content} />
						</div>
					</div>
				</div>
			);
		}

		if (currentItem.type === "link") {
			return (
				<div className="h-full w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(16,16,16,0.82)]">
					<div className="h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
						<div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-5 sm:p-6">
							<LinkRenderer item={currentItem} linkContent={linkContent} />
						</div>
					</div>
				</div>
			);
		}

		if (isDocumentType(currentItem.type)) {
			return (
				<div className="h-full w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(16,16,16,0.82)]">
					<div className="h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
						<div className="mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card p-5 sm:p-6">
							<DocumentRenderer item={currentItem} />
						</div>
					</div>
				</div>
			);
		}

		return null;
	};

	return (
		<>
			<BaseModal open={open} onOpenChange={onOpenChange} size="full" variant="fullscreen" className="border-0 bg-black/35 shadow-none backdrop-blur-xl" preventScroll>
				<div className="relative h-full w-full overflow-hidden bg-black" {...bind}>
					{backgroundSrc && (
						<div className="absolute inset-0 overflow-hidden">
							<img src={backgroundSrc} alt="" className="h-full w-full scale-110 object-cover opacity-28 blur-3xl" draggable={false} />
							<div className="absolute inset-0 bg-black/55" />
						</div>
					)}

					<div className="relative z-10 h-full w-full overflow-hidden px-6 py-10">
						<div className="relative h-full w-full overflow-hidden">
							<AnimatePresence initial={false} mode="sync" custom={direction}>
								<motion.div
									key={currentItem.id}
									custom={direction}
									variants={viewerSlideVariants}
									initial="enter"
									animate="center"
									exit="exit"
									transition={viewerSlideTransition}
									{...gestures}
									className="absolute inset-0 flex items-center justify-center">
									{renderContent()}
								</motion.div>
							</AnimatePresence>
						</div>
					</div>

					<ViewerOverlayControls
						visible={isHovered}
						actions={overlayActions}
						canGoPrevious={currentIndex > 0}
						canGoNext={currentIndex < normalizedItems.length - 1}
						onPrevious={goToPrevious}
						onNext={goToNext}
						onClose={() => onOpenChange(false)}
					/>

					<AnimatePresence initial={false}>
						{showDetails && (
							<motion.div
								initial={{ opacity: 0, y: 16 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 16 }}
								transition={{ duration: 0.18 }}
								className="absolute bottom-20 left-6 z-20 w-[min(360px,calc(100vw-48px))] overflow-hidden rounded-3xl border border-white/10 bg-black/78 p-4 text-white">
								<div className="space-y-4">
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-sm text-white/70">
											{currentItem.type === "media" ? <ImageIcon className="size-4" /> : currentItem.type === "audio" ? <Play className="size-4" /> : currentItem.type === "link" ? <Globe className="size-4" /> : currentItem.type === "todo" ? <ListChecks className="size-4" /> : <FileText className="size-4" />}
											<span>{currentItem.type.toUpperCase()}</span>
										</div>
										<p className="text-base font-medium text-white">{currentItem.title || "Без названия"}</p>
									</div>

									<div className="space-y-2 text-sm text-white/65">
										<div className="flex items-center gap-2"><Calendar className="size-4" />Создано {formatDate(currentItem.created_at)}</div>
										{readingTime && <p>{readingTime}</p>}
										{currentItem.updated_at !== currentItem.created_at && <p>Обновлено {formatDate(currentItem.updated_at)}</p>}
										{currentItem.type === "link" && linkContent?.metadata.author && <p>Автор: {linkContent.metadata.author}</p>}
										{currentItem.type === "audio" && audioData?.track?.artist && <p>Исполнитель: {audioData.track.artist}</p>}
									</div>

									<div className="space-y-2">
										<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-white/45">
											<Tag className="size-3.5" />
											Теги
										</div>
										<TagManager tags={currentItem.tags} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag} inputPlaceholder="Добавить тег..." />
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</BaseModal>

			<ConfirmDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title="Удалить контент?" description="Это действие нельзя отменить. Элемент будет удалён навсегда." confirmText="Удалить" cancelText="Отмена" variant="destructive" onConfirm={confirmDelete} />
		</>
	);
}
