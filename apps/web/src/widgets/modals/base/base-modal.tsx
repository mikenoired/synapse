"use client";

import { cn } from "@synapse/ui/cn";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { modalAnimations } from "@/shared/ui/design-tokens";

import { useModalFocus } from "../hooks";

interface BaseModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
	className?: string;
	size?: "sm" | "md" | "lg" | "xl" | "full";
	variant?: "default" | "fullscreen" | "drawer";
	closeOnOverlayClick?: boolean;
	closeOnEscape?: boolean;
	preventScroll?: boolean;
}

const sizeClasses = {
	sm: "max-w-md",
	md: "max-w-2xl",
	lg: "max-w-4xl",
	xl: "max-w-6xl",
	full: "max-w-none w-screen h-screen rounded-none",
};

export function BaseModal({
	open,
	onOpenChange,
	children,
	className,
	size = "lg",
	variant = "default",
	closeOnOverlayClick = true,
	closeOnEscape = true,
	preventScroll = true,
}: BaseModalProps) {
	const [mounted, setMounted] = useState(false);
	const modalRef = useModalFocus({
		enabled: open,
		autoFocus: true,
		restoreFocus: true,
	});

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		if (!preventScroll) return;

		if (open) {
			document.body.style.overflow = "hidden";
			document.body.style.paddingRight = "var(--removed-body-scroll-bar-size, 0px)";
		} else {
			document.body.style.overflow = "";
			document.body.style.paddingRight = "";
		}

		return () => {
			document.body.style.overflow = "";
			document.body.style.paddingRight = "";
		};
	}, [open, preventScroll]);

	useEffect(() => {
		if (!closeOnEscape || !open) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onOpenChange(false);
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [open, closeOnEscape, onOpenChange]);

	if (!mounted) return null;

	const animation =
		variant === "fullscreen"
			? modalAnimations.fullscreen
			: variant === "drawer"
				? modalAnimations.slideUp
				: modalAnimations.content;

	return (
		<AnimatePresence mode="wait">
			{open && (
				<motion.div
					key="modal-overlay"
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
					initial={modalAnimations.overlay.initial}
					animate={modalAnimations.overlay.animate}
					exit={modalAnimations.overlay.exit}
					transition={modalAnimations.overlay.transition}
					onClick={closeOnOverlayClick ? () => onOpenChange(false) : undefined}>
					<motion.div
						key="modal-content"
						ref={modalRef}
						initial={animation.initial}
						animate={animation.animate}
						exit={animation.exit}
						transition={animation.transition}
						className={cn(
							"relative z-10 m-4 bg-background border border-border shadow-2xl overflow-hidden flex flex-col rounded-lg",
							variant === "fullscreen" && "w-screen h-screen rounded-none m-0",
							variant === "drawer" && "w-full max-w-lg",
							variant === "default" && sizeClasses[size],
							variant === "default" && "max-h-[95vh]",
							className
						)}
						onClick={(e) => e.stopPropagation()}>
						{children}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
