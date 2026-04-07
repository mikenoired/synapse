import { cn } from "@synapse/ui/cn";
import type { HTMLAttributes } from "react";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("animate-pulse bg-muted", className)} {...props} />;
}

export { Skeleton };
