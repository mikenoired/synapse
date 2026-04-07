"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import AiTab from "@/features/settings-ai/ui/ai-tab";
import GeneralTab from "@/features/settings-general/ui/general-tab";
import MediaTab from "@/features/settings-media/ui/media-tab";
import ThemingTab from "@/features/settings-theming/ui/theming-tab";
import type { SettingsTabKey } from "@/features/settings/model/settings-tabs";

import { SettingsModalNav } from "./settings-modal-nav";

interface SettingsModalProps {
	activeTab: SettingsTabKey;
	closeHref: string;
	open: boolean;
	onClose: () => void;
}

const tabComponentMap = {
	general: GeneralTab,
	media: MediaTab,
	ai: AiTab,
	theming: ThemingTab,
};

function useModalSideEffects(
	open: boolean,
	onClose: () => void,
	modalRef: React.RefObject<HTMLDivElement | null>
) {
	useEffect(() => {
		if (!open) {
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		modalRef.current?.focus();

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [modalRef, open]);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose, open]);
}

export function SettingsModal({ activeTab, closeHref, open, onClose }: SettingsModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);
	const ActiveTab = tabComponentMap[activeTab];
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useModalSideEffects(open, onClose, modalRef);

	return (
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ backgroundColor: "rgba(15, 23, 42, 0)", backdropFilter: "blur(0px)" }}
					animate={{ backgroundColor: "rgba(15, 23, 42, 0.28)", backdropFilter: "blur(10px)" }}
					exit={{ backgroundColor: "rgba(15, 23, 42, 0)", backdropFilter: "blur(0px)" }}
					transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
					onClick={onClose}
					className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
					<motion.div
						ref={modalRef}
						tabIndex={-1}
						role="dialog"
						aria-modal="true"
						initial={{ filter: "blur(12px)", opacity: 0, scale: 0.98, y: 18 }}
						animate={{ filter: "blur(0px)", opacity: 1, scale: 1, y: 0 }}
						exit={{ filter: "blur(10px)", opacity: 0, scale: 0.985, y: 12 }}
						transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
						onClick={(event) => event.stopPropagation()}
						className="relative grid h-[min(760px,calc(100vh-2rem))] w-full max-w-[920px] overflow-hidden rounded-xl border border-border bg-background md:grid-cols-[220px_minmax(0,1fr)]">
						<Link
							href={closeHref}
							scroll={false}
							className="absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
							aria-label="Close settings">
							<X className="size-[18px]" />
						</Link>
						<div className="flex flex-col p-3 pt-12 md:border-r md:border-border md:p-3 md:pt-3">
							<SettingsModalNav activeTab={activeTab} pathname={pathname} search={searchParams.toString()} />
						</div>
						<div className="min-h-0 overflow-hidden">
							<div className="h-full overflow-y-auto px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-6">
								<AnimatePresence mode="wait">
									<motion.div
										key={activeTab}
										initial={{ filter: "blur(10px)", opacity: 0, y: 10 }}
										animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
										exit={{ filter: "blur(8px)", opacity: 0, y: -6 }}
										transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
										<ActiveTab />
									</motion.div>
								</AnimatePresence>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
