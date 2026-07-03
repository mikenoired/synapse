"use client";
import { Modal } from "@synapse/ui/components";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { getPresignedMediaUrl } from "@/shared/lib/image-utils";
import type { Content } from "@/shared/lib/schemas";
import { parseAudioJson } from "@/shared/lib/schemas";

interface AudioViewerModalProps {
	open: boolean;
	onOpenChange: (isOpen: boolean) => void;
	item: Content;
}

export function AudioViewerModal({ open: _open, onOpenChange, item }: AudioViewerModalProps) {
	const audioData = useMemo(() => parseAudioJson(item.content), [item.content]);
	const audioUrlApi = audioData?.audio?.url || "";
	const [audioSrc, setAudioSrc] = useState("");
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [seeking, setSeeking] = useState(false);
	const [seekValue, setSeekValue] = useState(0);
	const [volume, setVolume] = useState(1);
	const [muted, setMuted] = useState(false);
	const [coverSrc, setCoverSrc] = useState("");
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		if (!_open) {
			setAudioSrc("");
			setIsPlaying(false);
			setCurrentTime(0);
			setDuration(0);
		}
	}, [_open]);

	useEffect(() => {
		let cancelled = false;
		if (!_open) return;
		setAudioSrc("");
		if (audioUrlApi) {
			const url = getPresignedMediaUrl(audioUrlApi);
			if (!cancelled) {
				setAudioSrc(url);
			} else {
				if (!cancelled) setAudioSrc("");
			}
		}
		return () => {
			cancelled = true;
		};
	}, [_open, audioUrlApi]);

	const isTrack = Boolean(audioData?.track?.isTrack);
	const coverUrl = audioData?.cover?.url;

	useEffect(() => {
		let cancelled = false;
		setCoverSrc("");
		if (coverUrl) {
			const url = getPresignedMediaUrl(coverUrl);
			if (!cancelled) setCoverSrc(url);
		} else {
			if (!cancelled) setCoverSrc("");
		}
		return () => {
			cancelled = true;
		};
	}, [coverUrl]);

	useEffect(() => {
		const compute = () => {
			if (typeof window === "undefined") return;
			const nav: any = navigator;
			const ua: string = nav?.userAgent || "";
			const uaDataMobile: boolean = Boolean(nav?.userAgentData?.mobile);
			const touch = Number(nav?.maxTouchPoints || 0) > 1;
			const isMobileUA = /Android|iPhone|iPad|iPod/i.test(ua) || uaDataMobile;
			setIsMobile(isMobileUA || touch);
		};
		compute();
		window.addEventListener("resize", compute);
		return () => window.removeEventListener("resize", compute);
	}, []);

	useEffect(() => {
		const el = audioRef.current;
		if (!el) return;

		const onLoaded = () => {
			setDuration(Number.isNaN(el.duration) ? 0 : el.duration);
			setCurrentTime(Number.isNaN(el.currentTime) ? 0 : el.currentTime);
			el.play()
				.then(() => setIsPlaying(true))
				.catch(() => setIsPlaying(false));
		};
		const onTime = () => {
			if (!seeking) setCurrentTime(el.currentTime);
		};
		const onEnd = () => {
			setIsPlaying(false);
		};

		el.addEventListener("loadedmetadata", onLoaded);
		el.addEventListener("timeupdate", onTime);
		el.addEventListener("ended", onEnd);
		return () => {
			el.removeEventListener("loadedmetadata", onLoaded);
			el.removeEventListener("timeupdate", onTime);
			el.removeEventListener("ended", onEnd);
		};
	}, [audioSrc, seeking]);

	useEffect(() => {
		const el = audioRef.current;
		if (!el) return;
		el.muted = muted;
	}, [muted]);

	useEffect(() => {
		const el = audioRef.current;
		if (!el) return;
		el.volume = volume;
	}, [volume]);

	const togglePlay = () => {
		const el = audioRef.current;
		if (!el) return;
		if (isPlaying) {
			el.pause();
			setIsPlaying(false);
		} else {
			el.play()
				.then(() => setIsPlaying(true))
				.catch(() => setIsPlaying(false));
		}
	};

	const formatTime = (sec: number) => {
		if (!Number.isFinite(sec) || sec < 0) sec = 0;
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	const onSeekStart = () => setSeeking(true);
	const onSeekChange = (val: number) => {
		setSeekValue(val);
	};
	const onSeekEnd = () => {
		const el = audioRef.current;
		if (!el) {
			setSeeking(false);
			return;
		}
		const next = (seekValue / 100) * (duration || 0);
		el.currentTime = Number.isFinite(next) ? next : 0;
		setCurrentTime(el.currentTime);
		setSeeking(false);
	};

	const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

	const InfoBlock = (
		<div className="min-w-0">
			<div className="break-words text-lg font-semibold">
				{audioData?.track?.title || item.title || "Аудио"}
			</div>
			{(audioData?.track?.artist || audioData?.track?.album) && (
				<div className="text-sm text-muted-foreground">
					{[audioData?.track?.artist, audioData?.track?.album].filter(Boolean).join(" • ")}
				</div>
			)}
		</div>
	);

	const Controls = (
		<div className="w-full">
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-center">
					<button
						type="button"
						onClick={togglePlay}
						aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
						className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
						{isPlaying ? <Pause className="size-6" /> : <Play className="size-6" />}
					</button>
				</div>
				<div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 sm:gap-3">
					<div className="w-12 shrink-0 text-right text-xs tabular-nums">{formatTime(currentTime)}</div>
					<input
						type="range"
						min={0}
						max={100}
						value={seeking ? seekValue : progressPercent}
						onMouseDown={onSeekStart}
						onTouchStart={onSeekStart}
						onChange={(e) => onSeekChange(Number(e.target.value))}
						onMouseUp={onSeekEnd}
						onTouchEnd={onSeekEnd}
						className="min-w-0 w-full cursor-pointer accent-primary"
					/>
					<div className="w-12 shrink-0 text-xs tabular-nums">{formatTime(duration)}</div>
				</div>
				{!isMobile && (
					<div className="flex items-center justify-center gap-3">
						<button
							type="button"
							onClick={() => setMuted(!muted)}
							aria-label={muted || volume === 0 ? "Включить звук" : "Выключить звук"}
							className="flex size-8 shrink-0 items-center justify-center rounded text-muted-foreground">
							{muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
						</button>
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={muted ? 0 : volume}
							onChange={(e) => setVolume(Number(e.target.value))}
							className="h-2 w-28 max-w-[42vw] shrink-0 cursor-pointer accent-primary"
						/>
					</div>
				)}
			</div>
		</div>
	);

	return (
		<Modal open={_open} onOpenChange={onOpenChange}>
			<div className="p-4">
				<audio ref={audioRef} src={audioSrc} className="hidden" />
				<div className="mx-auto w-full max-w-xl flex flex-col gap-4">
					{isTrack && coverSrc ? (
						<div className="relative w-full bg-muted rounded-lg" style={{ aspectRatio: "1 / 1" }}>
							<Image
								src={coverSrc}
								alt={audioData?.track?.title || item.title || "cover"}
								fill
								unoptimized
								className="object-cover z-10"
							/>
							{/** TODO: Make glow effect by main color of cover */}
							<Image
								src={coverSrc}
								alt={audioData?.track?.title || item.title || "cover"}
								fill
								unoptimized
								className="object-cover absolute inset-0 blur-2xl scale-110 opacity-50"
							/>
						</div>
					) : (
						<div className="w-full aspect-square rounded-lg border bg-muted/40" />
					)}
					{InfoBlock}
					{Controls}
				</div>
			</div>
		</Modal>
	);
}
