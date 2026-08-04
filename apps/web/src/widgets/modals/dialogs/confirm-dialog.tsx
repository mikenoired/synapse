import type { LucideIcon } from "lucide-react";
import { Info, X } from "lucide-react";

import { BaseModal } from "../base";
import { ModalActions, ModalBody, ModalHeader } from "../layout";

interface ConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	variant?: "tertiary" | "primary" | "secondary" | "ghost";
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
		return Info;
	};

	const Icon = getIcon();

	const getIconColor = () => {
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
					<div className={`rounded-full bg-muted/50 p-3 ${getIconColor()}`}>
						<Icon className="h-6 w-6" />
					</div>
					<div className="min-w-0 flex-1">
						<h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2>
						{description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
					</div>
					{!loading && (
						<button onClick={handleCancel} className="rounded p-1 transition-colors hover:bg-muted">
							<X className="h-5 w-5 text-muted-foreground" />
						</button>
					)}
				</div>
			</ModalHeader>

			<ModalBody noPadding>
				<div className="px-6 pb-6">
					<ModalActions position="right">
						<ModalActions.Button variant="tertiary" onClick={handleCancel} disabled={loading}>
							{cancelText}
						</ModalActions.Button>
						<ModalActions.Button
							variant="primary"
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
