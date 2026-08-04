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
	closeLabel?: string;
	nextLabel?: string;
	previousLabel?: string;
}

function getActionClassName(action: ViewerOverlayAction) {
	if (action.destructive) {
		return "h-10 rounded-full px-4 text-red-500 cursor-pointer";
	}

	return "h-10 rounded-full px-4 cursor-pointer";
}

export function ViewerOverlayControls({
	actions,
	canGoNext = false,
	canGoPrevious = false,
	onClose,
	onNext,
	onPrevious,
	visible,
	closeLabel = "Close viewer",
	nextLabel = "Next item",
	previousLabel = "Previous item",
}: ViewerOverlayControlsProps) {
	return (
		<>
			<AnimatePresence initial={false}>
				{visible && canGoPrevious && onPrevious && (
					<motion.div
						initial={{ opacity: 0, filter: "blur(10px)", x: -16 }}
						animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
						exit={{ opacity: 0, filter: "blur(0px)", x: -16 }}
						transition={{ duration: 0.16 }}
						className="absolute top-1/2 left-5 z-20">
						<Button
							onClick={onPrevious}
							aria-label={previousLabel}
							variant="secondary"
							size="icon-lg"
							className="-translate-y-1/2 rounded-full">
							<ChevronLeft className="size-5" />
						</Button>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence initial={false}>
				{visible && canGoNext && onNext && (
					<motion.div
						initial={{ opacity: 0, filter: "blur(10px)", x: 16 }}
						animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
						exit={{ opacity: 0, filter: "blur(0px)", x: 16 }}
						transition={{ duration: 0.16 }}
						className="absolute top-1/2 right-5 z-20">
						<Button
							onClick={onNext}
							aria-label={nextLabel}
							variant="secondary"
							size="icon-lg"
							className="-translate-y-1/2 rounded-full">
							<ChevronRight className="size-5" />
						</Button>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence initial={false}>
				{visible && actions.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0, y: 16, filter: "blur(10px)" }}
						transition={{ duration: 0.18 }}
						className="absolute right-6 bottom-6 z-20 flex flex-wrap items-center gap-2">
						{actions.map((action) => (
							<Button
								key={action.label}
								variant="secondary"
								leadingIcon={action.icon}
								size="sm"
								onClick={action.onClick}
								disabled={action.disabled}
								className={getActionClassName(action)}>
								{action.label}
							</Button>
						))}
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence initial={false}>
				{visible && (
					<motion.div
						initial={{ opacity: 0, x: 16, y: -16, filter: "blur(10px)" }}
						animate={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
						exit={{ opacity: 0, x: 16, y: -16, filter: "blur(10px)" }}
						transition={{ duration: 0.16 }}
						className="absolute top-6 right-6 z-20">
						<Button
							variant="secondary"
							size="icon"
							onClick={onClose}
							aria-label={closeLabel}
							className="rounded-full">
							<X className="size-4" />
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

export type { ViewerOverlayAction };
