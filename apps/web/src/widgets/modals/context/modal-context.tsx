"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

import type { Content } from "@/shared/lib/schemas";

export type ModalType = "viewer" | "editor" | "confirm" | "custom";

export interface ModalConfig {
	type: ModalType;
	contentType?: Content["type"];
	item?: Content | null;
	props?: Record<string, any>;
	onClose?: () => void;
	onSuccess?: () => void;
}

interface ModalContextType {
	activeModal: ModalConfig | null;
	openModal: (config: ModalConfig) => void;
	closeModal: () => void;
	isOpen: boolean;
}

const ModalContext = createContext<ModalContextType | null>(null);

interface ModalProviderProps {
	children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
	const [activeModal, setActiveModal] = useState<ModalConfig | null>(null);

	const openModal = useCallback((config: ModalConfig) => {
		setActiveModal(config);
	}, []);

	const closeModal = useCallback(() => {
		if (activeModal?.onClose) activeModal.onClose();

		setActiveModal(null);
	}, [activeModal]);

	const value: ModalContextType = {
		activeModal,
		openModal,
		closeModal,
		isOpen: activeModal !== null,
	};

	return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal() {
	const context = useContext(ModalContext);
	if (!context) throw new Error("useModal must be used within ModalProvider");

	return context;
}
