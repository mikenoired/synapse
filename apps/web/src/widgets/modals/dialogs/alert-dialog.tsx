"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

import { BaseModal } from "../base";
import { ModalActions, ModalBody, ModalHeader } from "../layout";

interface AlertDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmText?: string;
	variant?: "info" | "success" | "warning" | "error";
	icon?: LucideIcon;
	onConfirm?: () => void;
}

export function AlertDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = "OK",
	variant = "info",
	icon,
	onConfirm,
}: AlertDialogProps) {
	const handleConfirm = () => {
		onConfirm?.();
		onOpenChange(false);
	};

	const getIcon = () => {
		if (icon) return icon;
		switch (variant) {
			case "success":
				return CheckCircle2;
			case "warning":
				return AlertCircle;
			case "error":
				return XCircle;
			default:
				return Info;
		}
	};

	const Icon = getIcon();

	const getIconColor = () => {
		switch (variant) {
			case "success":
				return "text-green-500";
			case "warning":
				return "text-yellow-500";
			case "error":
				return "text-destructive";
			default:
				return "text-primary";
		}
	};

	return (
		<BaseModal open={open} onOpenChange={onOpenChange} size="sm">
			<ModalHeader bordered={false}>
				<div className="flex items-start gap-4">
					<div className={`p-3 rounded-full bg-muted/50 ${getIconColor()}`}>
						<Icon className="w-6 h-6" />
					</div>
					<div className="flex-1">
						<h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
						{description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}
					</div>
				</div>
			</ModalHeader>

			<ModalBody noPadding>
				<div className="px-6 pb-6">
					<ModalActions position="right">
						<ModalActions.Button onClick={handleConfirm}>{confirmText}</ModalActions.Button>
					</ModalActions>
				</div>
			</ModalBody>
		</BaseModal>
	);
}
