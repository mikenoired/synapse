import { useEffect, useRef } from "react";

interface UseModalFocusOptions {
	enabled?: boolean;
	autoFocus?: boolean;
	restoreFocus?: boolean;
}

export function useModalFocus({
	enabled = true,
	autoFocus = true,
	restoreFocus = true,
}: UseModalFocusOptions = {}) {
	const modalRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!enabled || !modalRef.current) return;

		if (restoreFocus) previousFocusRef.current = document.activeElement as HTMLElement;

		const modal = modalRef.current;
		const focusableElements = modal.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (autoFocus && firstElement) firstElement.focus();

		const handleTabKey = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;

			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement?.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement?.focus();
				}
			}
		};

		modal.addEventListener("keydown", handleTabKey);

		return () => {
			modal.removeEventListener("keydown", handleTabKey);
			if (restoreFocus && previousFocusRef.current) previousFocusRef.current.focus();
		};
	}, [enabled, autoFocus, restoreFocus]);

	return modalRef;
}
