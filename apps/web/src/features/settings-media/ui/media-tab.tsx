"use client";

import { HardDrive, PlayCircle } from "lucide-react";

import { trpc } from "@/shared/api/trpc";
import { useUserPreferences } from "@/shared/lib/user-preferences-context";
import { formatSize } from "@/shared/lib/utils";

function StorageMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className="font-medium text-foreground">{value}</span>
		</div>
	);
}

function AutoplayPreference({
	disabled,
	enabled,
	onToggle,
}: {
	disabled: boolean;
	enabled: boolean;
	onToggle: () => void;
}) {
	return (
		<div className="flex flex-col gap-4 rounded-[1.75rem] bg-muted px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="min-w-0 space-y-1.5">
				<div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
					<PlayCircle className="size-4 text-muted-foreground" />
					Автовоспроизведение
				</div>
				<p className="max-w-md text-sm leading-6 text-muted-foreground">
					Автоматически запускает аудио и видео сразу после открытия в просмотрщике.
				</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={enabled}
				disabled={disabled}
				onClick={onToggle}
				className={`relative inline-flex h-7 w-12 shrink-0 items-center self-start rounded-full transition sm:self-center ${enabled ? "bg-foreground" : "bg-background"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
				<span
					className={`inline-block size-5 rounded-full bg-background transition-transform ${enabled ? "translate-x-6" : "translate-x-1"} ${enabled ? "bg-background" : "bg-foreground"}`}
				/>
			</button>
		</div>
	);
}

export default function MediaTab() {
	const { data: storageUsage } = trpc.user.getStorageUsage.useQuery();
	const { isReady, mediaAutoplayEnabled, setMediaAutoplayEnabled } = useUserPreferences();
	const { fileSize, files } = storageUsage || { fileSize: 0, files: 0 };

	const usedSpaceBytes = fileSize || 0;
	const totalFiles = files || 0;

	return (
		<div className="space-y-4 py-1">
			<div className="rounded-[1.75rem] bg-muted p-5">
				<div className="mb-5 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-foreground">
					<HardDrive className="size-4 text-muted-foreground" />
					<span>Локальное хранилище</span>
				</div>

				<div className="space-y-3">
					<StorageMetric label="Использовано" value={formatSize(usedSpaceBytes)} />
					<StorageMetric label="Файлов" value={totalFiles.toLocaleString("ru-RU")} />
				</div>
			</div>

			<AutoplayPreference
				disabled={!isReady}
				enabled={mediaAutoplayEnabled}
				onToggle={() => setMediaAutoplayEnabled(!mediaAutoplayEnabled)}
			/>
		</div>
	);
}
