"use client";

import { Button } from "@synapse/ui/components";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Edit2, Info, Pause, Play, Trash2, Volume2, VolumeX, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import useMouseActivity from "@/shared/hooks/use-mouse-activity";
import { getPresignedMediaUrl } from "@/shared/lib/image-utils";
import type { Content } from "@/shared/lib/schemas";
import { parseAudioJson } from "@/shared/lib/schemas";

import { BaseModal } from "../base";
import { ConfirmDialog } from "../dialogs";
import { useModalKeyboard } from "../hooks";
import { showToast } from "../utils";

interface AudioViewerModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item: Content;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
}

function formatDate(date: string) {
	return new Date(date).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function formatTime(seconds: number) {
	const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
	const minutes = Math.floor(safeSeconds / 60);
	const remainder = Math.floor(safeSeconds % 60);
	return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatDownloadName(item: Content, audioUrl: string) {
	const extension = audioUrl.split("?")[0]?.split(".").pop()?.trim();
	const safeTitle = (item.title || item.id).trim().replace(/[^a-zA-Z0-9-_]+/g, "-");

	if (!extension) {
		return safeTitle;
	}

	return `${safeTitle}.${extension}`;
}

export function AudioViewerModal({ open, onOpenChange, item, onEdit, onDelete }: AudioViewerModalProps) {
	const router = useRouter();
	const audioData = useMemo(() => parseAudioJson(item.content), [item.content]);
	const audioUrl = audioData?.audio?.url || "";
	const coverUrl = audioData?.cover?.url || "";
	const isTrack = Boolean(audioData?.track?.isTrack);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioSrc, setAudioSrc] = useState("");
	const [coverSrc, setCoverSrc] = useState("");
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [seeking, setSeeking] = useState(false);
	const [seekValue, setSeekValue] = useState(0);
	const [volume, setVolume] = useState(1);
	const [muted, setMuted] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [showDetails, setShowDetails] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
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
		shortcuts: [
			{
				key: " ",
				handler: () => togglePlay(),
				preventDefault: true,
			},
		],
	});

	useEffect(() => {
		if (!open) {
			setShowDetails(false);
			setAudioSrc("");
			setIsPlaying(false);
			setCurrentTime(0);
			setDuration(0);
			return;
		}

		setShowDetails(false);
	}, [open]);

	useEffect(() => {
		let cancelled = false;
		if (!open) {
			return;
		}

		const resolvedAudioSrc = audioUrl ? getPresignedMediaUrl(audioUrl) : "";
		const resolvedCoverSrc = coverUrl ? getPresignedMediaUrl(coverUrl) : "";

		if (!cancelled) {
			setAudioSrc(resolvedAudioSrc);
			setCoverSrc(resolvedCoverSrc);
		}

		return () => {
			cancelled = true;
		};
	}, [audioUrl, coverUrl, open]);

	useEffect(() => {
		const compute = () => {
			if (typeof window === "undefined") return;
			const nav = navigator as Navigator & {
				maxTouchPoints?: number;
				userAgentData?: { mobile?: boolean };
			};
			const ua = nav.userAgent || "";
			const touch = Number(nav.maxTouchPoints || 0) > 1;
			const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(ua) || Boolean(nav.userAgentData?.mobile);
			setIsMobile(isMobileDevice || touch);
		};

		compute();
		window.addEventListener("resize", compute);
		return () => window.removeEventListener("resize", compute);
	}, []);

	useEffect(() => {
		const element = audioRef.current;
		if (!element) return;

		const handleLoaded = () => {
			setDuration(Number.isNaN(element.duration) ? 0 : element.duration);
			setCurrentTime(Number.isNaN(element.currentTime) ? 0 : element.currentTime);
			element
				.play()
				.then(() => setIsPlaying(true))
				.catch(() => setIsPlaying(false));
		};

		const handleTimeUpdate = () => {
			if (!seeking) {
				setCurrentTime(element.currentTime);
			}
		};

		const handleEnded = () => {
			setIsPlaying(false);
		};

		element.addEventListener("loadedmetadata", handleLoaded);
		element.addEventListener("timeupdate", handleTimeUpdate);
		element.addEventListener("ended", handleEnded);

		return () => {
			element.removeEventListener("loadedmetadata", handleLoaded);
			element.removeEventListener("timeupdate", handleTimeUpdate);
			element.removeEventListener("ended", handleEnded);
		};
	}, [audioSrc, seeking]);

	useEffect(() => {
		if (!audioRef.current) return;
		audioRef.current.muted = muted;
	}, [muted]);

	useEffect(() => {
		if (!audioRef.current) return;
		audioRef.current.volume = volume;
	}, [volume]);

	const togglePlay = () => {
		const element = audioRef.current;
		if (!element) return;

		if (isPlaying) {
			element.pause();
			setIsPlaying(false);
			return;
		}

		element
			.play()
			.then(() => setIsPlaying(true))
			.catch(() => setIsPlaying(false));
	};

	const handleSeekEnd = () => {
		const element = audioRef.current;
		if (!element) {
			setSeeking(false);
			return;
		}

		const nextTime = (seekValue / 100) * (duration || 0);
		element.currentTime = Number.isFinite(nextTime) ? nextTime : 0;
		setCurrentTime(element.currentTime);
		setSeeking(false);
	};

	const handleEdit = () => {
		if (onEdit) {
			onEdit(item.id);
		} else {
			router.push(`/edit/${item.id}`);
		}

		onOpenChange(false);
	};

	const handleDownload = async () => {
		if (!audioSrc) {
			return;
		}

		setIsDownloading(true);

		try {
			const response = await fetch(audioSrc);
			if (!response.ok) {
				throw new Error("Download failed");
			}

			const blob = await response.blob();
			const objectUrl = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = objectUrl;
			link.download = formatDownloadName(item, audioUrl);
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

	const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
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
					{coverSrc && (
						<div className="absolute inset-0 overflow-hidden">
							<img
								src={coverSrc}
								alt=""
								className="h-full w-full scale-110 object-cover opacity-30 blur-3xl"
								draggable={false}
							/>
							<div className="absolute inset-0 bg-black/55" />
						</div>
					)}

					<audio ref={audioRef} src={audioSrc} className="hidden" />

					<div className="relative z-10 flex h-full items-center justify-center px-6 py-10">
						<div className="flex w-full max-w-[min(88vw,720px)] flex-col items-center gap-4">
							<div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-md border border-white/10 bg-white/5 sm:max-w-[360px]">
								{coverSrc ? (
									<>
										<Image
											src={coverSrc}
											alt={audioData?.track?.title || item.title || "cover"}
											fill
											unoptimized
											className="absolute inset-0 scale-105 object-cover opacity-35 blur-2xl"
										/>
										<Image
											src={coverSrc}
											alt={audioData?.track?.title || item.title || "cover"}
											fill
											unoptimized
											className="relative z-10 object-cover"
										/>
									</>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-white/5 text-sm text-white/50">
										Нет обложки
									</div>
								)}
							</div>

							<div className="space-y-1 text-center text-white">
								<p className="text-xl font-medium leading-tight">
									{audioData?.track?.title || item.title || "Аудио"}
								</p>
								{(audioData?.track?.artist || audioData?.track?.album) && (
									<p className="text-sm text-white/60">
										{[audioData?.track?.artist, audioData?.track?.album].filter(Boolean).join(" • ")}
									</p>
								)}
							</div>

							<div className="w-full max-w-[560px] px-4 py-4 text-white sm:px-5">
								<div className="flex flex-col gap-4">
									<div className="flex items-center justify-center">
										<button
											type="button"
											onClick={togglePlay}
											className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-white/90">
											{isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
										</button>
									</div>

									<div className="flex items-center gap-3">
										<div className="w-11 text-right text-xs tabular-nums text-white/60">
											{formatTime(currentTime)}
										</div>
										<input
											type="range"
											min={0}
											max={100}
											value={seeking ? seekValue : progressPercent}
											onMouseDown={() => setSeeking(true)}
											onTouchStart={() => setSeeking(true)}
											onChange={(e) => setSeekValue(Number(e.target.value))}
											onMouseUp={handleSeekEnd}
											onTouchEnd={handleSeekEnd}
											className="flex-1 cursor-pointer"
										/>
										<div className="w-11 text-xs tabular-nums text-white/60">{formatTime(duration)}</div>
									</div>

									{!isMobile && (
										<div className="flex items-center justify-center gap-3">
											<button
												type="button"
												onClick={() => setMuted((current) => !current)}
												className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
												{muted || volume === 0 ? (
													<VolumeX className="size-4" />
												) : (
													<Volume2 className="size-4" />
												)}
											</button>
											<input
												type="range"
												min={0}
												max={1}
												step={0.01}
												value={muted ? 0 : volume}
												onChange={(e) => setVolume(Number(e.target.value))}
												className="w-32 cursor-pointer"
											/>
										</div>
									)}
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
								<Button
									variant="secondary"
									size="sm"
									onClick={handleDownload}
									disabled={isDownloading || !audioSrc}
									className="h-10 rounded-full border border-white/12 bg-black/55 px-4 text-white hover:bg-black/70">
									<Download className="mr-2 size-4" />
									{isDownloading ? "Скачивание..." : "Скачать"}
								</Button>
								{onEdit && (
									<Button
										variant="secondary"
										size="sm"
										onClick={handleEdit}
										className="h-10 rounded-full border border-white/12 bg-black px-4 text-white hover:bg-black/70">
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
									<div className="space-y-2">
										<p className="text-base font-medium text-white">
											{audioData?.track?.title || item.title || "Аудио"}
										</p>
										<p className="text-sm text-white/60">{isTrack ? "Трек" : "Аудиофайл"}</p>
									</div>

									<div className="space-y-2 text-sm text-white/65">
										<p>Создано {formatDate(item.created_at)}</p>
										{audioData?.track?.artist && <p>Исполнитель: {audioData.track.artist}</p>}
										{audioData?.track?.album && <p>Альбом: {audioData.track.album}</p>}
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
				title="Удалить аудио?"
				description="Это действие нельзя отменить. Аудиофайл будет удалён навсегда."
				confirmText="Удалить"
				cancelText="Отмена"
				variant="destructive"
				onConfirm={async () => {
					if (!onDelete) return;
					try {
						await onDelete(item.id);
						showToast.success("Аудио удалено");
						onOpenChange(false);
					} catch {
						showToast.error("Ошибка при удалении");
					}
				}}
			/>
		</>
	);
}
