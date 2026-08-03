import type { ImgHTMLAttributes } from "react";

export default function Image({
	src,
	alt,
	width,
	height,
	fill: _fill,
	unoptimized: _unoptimized,
	sizes: _sizes,
	...props
}: ImgHTMLAttributes<HTMLImageElement> & {
	src: string;
	width?: number;
	height?: number;
	fill?: boolean;
	unoptimized?: boolean;
	sizes?: string;
}) {
	return <img src={src} alt={alt} width={width} height={height} {...props} />;
}
