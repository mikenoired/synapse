interface PreviewImageProps {
	url: string;
	alt?: string;
	className?: string;
	skeletonClassName?: string;
}

export function PreviewImage({ url, alt, className, skeletonClassName }: PreviewImageProps) {
	if (!url) {
		return <div className={skeletonClassName || "h-full w-full animate-pulse rounded bg-muted"} />;
	}
	return <img src={url} alt={alt || ""} className={className} draggable={false} />;
}
