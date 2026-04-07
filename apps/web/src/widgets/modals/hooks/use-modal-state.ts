import { useCallback, useEffect, useState } from "react";

export type ModalStatus = "closed" | "opening" | "open" | "closing" | "minimized";

interface UseModalStateOptions {
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	animated?: boolean;
	animationDuration?: number;
}

export function useModalState({
	defaultOpen = false,
	onOpenChange,
	animated = true,
	animationDuration = 250,
}: UseModalStateOptions = {}) {
	const [status, setStatus] = useState<ModalStatus>(defaultOpen ? "open" : "closed");
	const [isOpen, setIsOpen] = useState(defaultOpen);

	const open = useCallback(() => {
		if (animated) {
			setStatus("opening");
			setIsOpen(true);
			setTimeout(() => {
				setStatus("open");
			}, 50);
		} else {
			setStatus("open");
			setIsOpen(true);
		}
		onOpenChange?.(true);
	}, [animated, onOpenChange]);

	const close = useCallback(() => {
		if (animated) {
			setStatus("closing");
			setTimeout(() => {
				setStatus("closed");
				setIsOpen(false);
			}, animationDuration);
		} else {
			setStatus("closed");
			setIsOpen(false);
		}
		onOpenChange?.(false);
	}, [animated, animationDuration, onOpenChange]);

	const toggle = useCallback(() => {
		if (isOpen) close();
		else open();
	}, [isOpen, close, open]);

	const minimize = useCallback(() => {
		setStatus("minimized");
	}, []);

	useEffect(() => {
		if (defaultOpen && status === "closed") open();
	}, [defaultOpen, status, open]);

	return {
		status,
		isOpen,
		open,
		close,
		toggle,
		minimize,
		isClosed: status === "closed",
		isOpening: status === "opening",
		isClosing: status === "closing",
		isMinimized: status === "minimized",
	};
}
