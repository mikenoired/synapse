import type { Transition } from "framer-motion";

export const modalAnimations = {
	overlay: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: {
			duration: 0.2,
			ease: "easeOut",
		} as Transition,
	},

	content: {
		initial: { opacity: 0, scale: 0.95, y: 20 },
		animate: { opacity: 1, scale: 1, y: 0 },
		exit: { opacity: 0, scale: 0.98, y: 10 },
		transition: {
			type: "spring",
			duration: 0.35,
			bounce: 0.1,
			opacity: { duration: 0.2, delay: 0.05 },
		} as Transition,
	},

	fullscreen: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: {
			duration: 0.25,
			ease: "easeOut",
		} as Transition,
	},

	slide: {
		enter: (direction: number) => ({
			x: direction > 0 ? "100%" : "-100%",
			opacity: 0,
		}),
		center: {
			zIndex: 1,
			x: 0,
			opacity: 1,
		},
		exit: (direction: number) => ({
			zIndex: 0,
			x: direction < 0 ? "100%" : "-100%",
			opacity: 0,
		}),
		transition: {
			x: { type: "tween", duration: 0.32, ease: [0.33, 1, 0.68, 1] },
			opacity: { duration: 0.2, ease: "linear" },
		} as Transition,
	},

	slideUp: {
		initial: { y: "100%", opacity: 0 },
		animate: { y: 0, opacity: 1 },
		exit: { y: "100%", opacity: 0 },
		transition: {
			type: "spring",
			damping: 30,
			stiffness: 300,
		} as Transition,
	},

	fade: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: 0.15 } as Transition,
	},
} as const;

export type ModalAnimations = typeof modalAnimations;
