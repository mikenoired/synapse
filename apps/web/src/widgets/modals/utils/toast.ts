import type { ReactElement } from "react";
import toast from "react-hot-toast";

interface ToastOptions {
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	duration?: number;
}

export const showToast = {
	success: (message: string, options?: ToastOptions) => {
		return toast.success(message, {
			duration: options?.duration || 3000,
			...(options?.description && {
				description: options.description,
			}),
		});
	},

	error: (message: string, options?: ToastOptions) => {
		return toast.error(message, {
			duration: options?.duration || 4000,
			...(options?.description && {
				description: options.description,
			}),
		});
	},

	info: (message: string, options?: ToastOptions) => {
		return toast(message, {
			icon: "ℹ️",
			duration: options?.duration || 3000,
		});
	},

	loading: (message: string) => {
		return toast.loading(message);
	},

	promise: <T>(
		promise: Promise<T>,
		messages: {
			loading: string;
			success: string | ((data: T) => string);
			error: string | ((error: any) => string);
		}
	) => {
		return toast.promise(promise, messages);
	},

	dismiss: (toastId?: string) => {
		toast.dismiss(toastId);
	},

	custom: (jsx: ReactElement | string | null, options?: Parameters<typeof toast.custom>[1]) => {
		return toast.custom(jsx, options);
	},
};

// Примеры использования:
// showToast.success('Контент сохранен')
// showToast.error('Ошибка при удалении')
// showToast.promise(saveContent(), {
//   loading: 'Сохранение...',
//   success: 'Сохранено!',
//   error: 'Ошибка'
// })
