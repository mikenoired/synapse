"use client";

interface PreviewImageProps {
	url: string;
	alt?: string;
	className?: string;
	skeletonClassName?: string;
}

export function PreviewImage({ url, alt, className, skeletonClassName }: PreviewImageProps) {
	if (!url) {
		return <div className={skeletonClassName || "bg-muted animate-pulse w-full h-full rounded"} />;
	}
	return <img src={url} alt={alt || ""} className={className} draggable={false} />;
}
