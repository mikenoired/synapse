import { Link as RouterLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

export default function Link({
	href,
	children,
	scroll: _scroll,
	...props
}: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }>) {
	return (
		<RouterLink to={href} {...props}>
			{children}
		</RouterLink>
	);
}
