"use client";

import { Button } from "@synapse/ui/components";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ViewerOverlayAction {
	destructive?: boolean;
	disabled?: boolean;
	icon: LucideIcon;
	label: string;
	onClick: () => void;
}

interface ViewerOverlayControlsProps {
	actions: ViewerOverlayAction[];
	canGoNext?: boolean;
	canGoPrevious?: boolean;
	onClose: () => void;
	onNext?: () => void;
	onPrevious?: () => void;
	visible: boolean;
}

function getActionClassName(action: ViewerOverlayAction) {
	if (action.destructive) {
		return "h-10 rounded-full border border-red-400/20 bg-red-500/20 px-4 text-white hover:bg-red-500/30";
	}

	return "h-10 rounded-full border border-white/12 bg-black/55 px-4 text-white hover:bg-black/70";
}

export function ViewerOverlayControls({
	actions,
	canGoNext = false,
	canGoPrevious = false,
	onClose,
	onNext,
	onPrevious,
	visible,
}: ViewerOverlayControlsProps) {
	return (
		<>
			<AnimatePresence initial={false}>
				{visible && canGoPrevious && onPrevious && (
					<motion.button
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.16 }}
						onClick={onPrevious}
						className="absolute left-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/55 text-white transition-colors hover:bg-black/70">
						<ChevronLeft className="size-5" />
					</motion.button>
				)}
			</AnimatePresence>

			<AnimatePresence initial={false}>
				{visible && canGoNext && onNext && (
					<motion.button
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.16 }}
						onClick={onNext}
						className="absolute right-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/55 text-white transition-colors hover:bg-black/70">
						<ChevronRight className="size-5" />
					</motion.button>
				)}
			</AnimatePresence>

			<AnimatePresence initial={false}>
				{visible && actions.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 16 }}
						transition={{ duration: 0.18 }}
						className="absolute bottom-6 left-6 z-20 flex flex-wrap items-center gap-2">
						{actions.map((action) => (
							<Button
								key={action.label}
								variant="secondary"
								size="sm"
								onClick={action.onClick}
								disabled={action.disabled}
								className={getActionClassName(action)}>
								<action.icon className="mr-2 size-4" />
								{action.label}
							</Button>
						))}
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence initial={false}>
				{visible && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.16 }}
						className="absolute right-6 top-6 z-20">
						<Button
							variant="secondary"
							size="icon"
							onClick={onClose}
							className="h-10 w-10 rounded-full border border-white/12 bg-black/55 text-white hover:bg-black/70">
							<X className="size-4" />
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

export type { ViewerOverlayAction };
