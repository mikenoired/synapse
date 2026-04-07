import { Badge } from "@synapse/ui/components";
import { Music2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { getPresignedMediaUrl } from "@/shared/lib/image-utils";
import type { Content } from "@/shared/lib/schemas";
import { parseAudioJson, parseMediaJson } from "@/shared/lib/schemas";

function ensureDataUri(base64: string): string {
	if (!base64) return "";
	if (base64.startsWith("data:")) return base64;
	return `data:image/jpeg;base64,${base64}`;
}

function getAspectRatio(width?: number, height?: number, fallback: string = "1 / 1"): string {
	if (!width || !height) {
		return fallback;
	}

	return `${width} / ${height}`;
}

interface MediaItemProps {
	item: Content;
	onItemClick?: (content: Content) => void;
}

interface RenderImageProps {
	imageUrl: string;
	title: string | null;
	blurThumb?: string;
	savedWidth?: number;
	savedHeight?: number;
}

function RenderImage({ imageUrl, title, blurThumb, savedWidth, savedHeight }: RenderImageProps) {
	const [loaded, setLoaded] = useState(false);
	const [errored, setErrored] = useState(false);
	const resolvedImageUrl = useMemo(() => getPresignedMediaUrl(imageUrl), [imageUrl]);
	const aspectRatio = getAspectRatio(savedWidth, savedHeight);

	return (
		<div
			className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-md"
			style={{ aspectRatio }}>
			{blurThumb && (
				<Image
					src={ensureDataUri(blurThumb)}
					alt="blur preview"
					className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-200 ease-in-out z-0"
					style={{ opacity: loaded && !errored ? 0 : 1 }}
					draggable={false}
					fill
					sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
				/>
			)}
			{resolvedImageUrl && !errored && (
				<Image
					src={resolvedImageUrl}
					alt={title || "Image"}
					className="w-full h-full object-cover relative z-10 transition-opacity duration-200 ease-in-out"
					style={{ opacity: loaded ? 1 : 0 }}
					onLoad={() => setLoaded(true)}
					onError={() => {
						setErrored(true);
						setLoaded(true);
					}}
					draggable={false}
					fill
					unoptimized
					sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
				/>
			)}
		</div>
	);
}

export default function MediaItem({ item, onItemClick }: MediaItemProps) {
	const media = parseMediaJson(item.content)?.media;
	const audioData = item.type === "audio" ? parseAudioJson(item.content) : null;
	const audio = audioData?.audio;
	const isAudio = item.type === "audio";
	const blurThumb = media?.thumbnailBase64 || "";
	const isVideo = media?.type === "video";
	const mainSrc = useMemo(() => {
		if (isVideo) {
			return media?.thumbnailUrl ? getPresignedMediaUrl(media.thumbnailUrl) : "";
		}

		return media?.url ? getPresignedMediaUrl(media.url) : "";
	}, [isVideo, media?.thumbnailUrl, media?.url]);
	const videoAspectRatio = getAspectRatio(media?.width, media?.height, "16 / 9");

	if (isAudio) {
		const isTrack = Boolean(audioData?.track?.isTrack);
		const coverUrl = audioData?.cover?.url;
		const fileName = (audio?.object || audio?.url || "").split("/").pop() || "audio";

		if (isTrack && coverUrl) {
			return (
				<div className="relative group" onClick={() => onItemClick?.(item)}>
					<RenderImage
						imageUrl={coverUrl}
						title={item.title || null}
						blurThumb={audioData?.cover?.thumbnailBase64}
						savedWidth={audioData?.cover?.width}
						savedHeight={audioData?.cover?.height}
					/>
					<div className="absolute bottom-0 left-0 right-0 p-2 pt-3 bg-gradient-to-t from-black/70 to-transparent text-white z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
						<div className="text-sm font-medium truncate">
							{audioData?.track?.title || item.title || fileName}
						</div>
						{(audioData?.track?.artist || audioData?.track?.album) && (
							<div className="text-xs opacity-80 truncate">
								{[audioData?.track?.artist, audioData?.track?.album].filter(Boolean).join(" • ")}
							</div>
						)}
					</div>
				</div>
			);
		}

		return (
			<div className="flex flex-col" onClick={() => onItemClick?.(item)}>
				<div className="w-full aspect-square rounded-lg border flex items-center justify-center bg-muted/40">
					<Music2 className="w-10 h-10 text-muted-foreground" />
				</div>
				<div className="mt-2 text-xs text-muted-foreground truncate">{fileName}</div>
			</div>
		);
	}

	return (
		<div className="relative" onClick={() => onItemClick?.(item)}>
			{isVideo ? (
				<div
					className="relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
					style={{ aspectRatio: videoAspectRatio }}>
					{blurThumb && (
						<Image
							src={ensureDataUri(blurThumb)}
							alt="blur preview"
							className="absolute inset-0 w-full h-full object-cover blur-lg scale-105 transition-opacity duration-500 ease-in-out z-0"
							style={{ opacity: mainSrc ? 0 : 1 }}
							draggable={false}
							fill
							sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
						/>
					)}
					{mainSrc && (
						<Image
							src={mainSrc}
							alt={item.title || "Video"}
							className="w-full h-full object-cover relative z-10 transition-opacity duration-500 ease-in-out"
							style={{ opacity: 1 }}
							draggable={false}
							fill
							unoptimized
							sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1920px) 25vw, 20vw"
						/>
					)}
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
						<svg
							width="64"
							height="64"
							viewBox="0 0 64 64"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="w-16 h-16 drop-shadow-lg">
							<path
								d="M20 16C20 13.7909 22.2386 12.5532 24.0711 13.7574L50.1421 31.7574C51.8579 32.8921 51.8579 35.1079 50.1421 36.2426L24.0711 54.2426C22.2386 55.4468 20 54.2091 20 52V16Z"
								fill="white"
								fillOpacity="0.8"
							/>
						</svg>
					</div>
				</div>
			) : mainSrc ? (
				<RenderImage
					imageUrl={media?.url || ""}
					title={item.title || null}
					blurThumb={blurThumb}
					savedWidth={media?.width}
					savedHeight={media?.height}
				/>
			) : null}
			{item.tags.length > 0 && (
				<div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
					<div className="flex flex-wrap gap-1">
						{item.tags.map((tag: string) => (
							<Badge key={tag} variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
								{tag}
							</Badge>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
