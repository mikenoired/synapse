"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Info, X } from "lucide-react";

import { BaseModal } from "../base";
import { ModalActions, ModalBody, ModalHeader } from "../layout";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	variant?: "default" | "destructive" | "warning";
	icon?: LucideIcon;
	onConfirm: () => void | Promise<void>;
	onCancel?: () => void;
	loading?: boolean;
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = "Подтвердить",
	cancelText = "Отмена",
	variant = "default",
	icon,
	onConfirm,
	onCancel,
	loading = false,
}: ConfirmDialogProps) {
	const handleConfirm = async () => {
		await onConfirm();
		onOpenChange(false);
	};

	const handleCancel = () => {
		onCancel?.();
		onOpenChange(false);
	};

	const getIcon = () => {
		if (icon) return icon;
		if (variant === "destructive" || variant === "warning") return AlertTriangle;
		return Info;
	};

	const Icon = getIcon();

	const getIconColor = () => {
		if (variant === "destructive") return "text-destructive";
		if (variant === "warning") return "text-yellow-500";
		return "text-primary";
	};

	return (
		<BaseModal
			open={open}
			onOpenChange={onOpenChange}
			size="sm"
			closeOnOverlayClick={!loading}
			closeOnEscape={!loading}>
			<ModalHeader bordered={false}>
				<div className="flex items-start gap-4">
					<div className={`p-3 rounded-full bg-muted/50 ${getIconColor()}`}>
						<Icon className="w-6 h-6" />
					</div>
					<div className="flex-1 min-w-0">
						<h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
						{description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
					</div>
					{!loading && (
						<button onClick={handleCancel} className="p-1 hover:bg-muted rounded transition-colors">
							<X className="w-5 h-5 text-muted-foreground" />
						</button>
					)}
				</div>
			</ModalHeader>

			<ModalBody noPadding>
				<div className="px-6 pb-6">
					<ModalActions position="right">
						<ModalActions.Button variant="outline" onClick={handleCancel} disabled={loading}>
							{cancelText}
						</ModalActions.Button>
						<ModalActions.Button
							variant={variant === "destructive" ? "destructive" : "default"}
							onClick={handleConfirm}
							disabled={loading}
							loading={loading}>
							{confirmText}
						</ModalActions.Button>
					</ModalActions>
				</div>
			</ModalBody>
		</BaseModal>
	);
}

// Hook для удобного использования
export function useConfirm() {
	return {
		confirm: (options: Omit<ConfirmDialogProps, "open" | "onOpenChange">) => {
			return new Promise<boolean>((resolve) => {
				// TODO: Интеграция с глобальным state для показа диалога
				// Пока возвращаем стандартный confirm
				const result = window.confirm(
					options.title + (options.description ? `\n${options.description}` : "")
				);
				resolve(result);
			});
		},
	};
}
