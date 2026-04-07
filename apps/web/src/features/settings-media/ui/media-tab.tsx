"use client";

import { HardDrive, PlayCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { trpc } from "@/shared/api/trpc";
import { useUserPreferences } from "@/shared/lib/user-preferences-context";
import { formatSize } from "@/shared/lib/utils";

const TOTAL_STORAGE_BYTES = 1000 * 1024 * 1024 * 1024;
const RING_RADIUS = 62;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const ANIMATION_DURATION_MS = 700;
const LOADING_DELAY_MS = 500;

function easeInOutCubic(value: number) {
	return value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;
}

function getRingColor(percent: number) {
	if (percent < 60) return "#22c55e";
	if (percent < 85) return "#eab308";
	return "#ef4444";
}

function StorageMetric({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: string;
	valueClassName?: string;
}) {
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className={valueClassName ?? "font-medium text-foreground"}>{value}</span>
		</div>
	);
}

function StorageUsageRing({ loading, percent }: { loading: boolean; percent: number }) {
	if (loading) {
		return <div className="h-40 w-40 animate-pulse rounded-full bg-muted" />;
	}

	return (
		<svg width="156" height="156" viewBox="0 0 156 156" className="block">
			<circle cx="78" cy="78" r={RING_RADIUS} fill="none" stroke="var(--muted)" strokeWidth="14" />
			<circle
				cx="78"
				cy="78"
				r={RING_RADIUS}
				fill="none"
				stroke={getRingColor(percent)}
				strokeWidth="14"
				strokeDasharray={RING_CIRCUMFERENCE}
				strokeDashoffset={RING_CIRCUMFERENCE * (1 - percent / 100)}
				strokeLinecap="round"
			/>
			<text
				x="50%"
				y="50%"
				textAnchor="middle"
				dominantBaseline="central"
				fontSize="2rem"
				fontWeight="700"
				fill="var(--foreground)">
				{Math.round(percent)}%
			</text>
		</svg>
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
		<div className="flex items-start justify-between gap-4 rounded-3xl bg-muted px-5 py-4">
			<div className="space-y-1.5">
				<div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
					<PlayCircle className="size-4 text-muted-foreground" />
					Autoplay on open
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
				className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${enabled ? "bg-foreground" : "bg-background"} ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
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
	const freeSpaceBytes = TOTAL_STORAGE_BYTES - usedSpaceBytes;
	const totalFiles = files || 0;
	const usagePercentage = (usedSpaceBytes / TOTAL_STORAGE_BYTES) * 100;

	const [loading, setLoading] = useState(true);
	const [animatedPercent, setAnimatedPercent] = useState(0);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => setLoading(false), LOADING_DELAY_MS);
		return () => window.clearTimeout(timeoutId);
	}, []);

	useEffect(() => {
		if (loading) {
			setAnimatedPercent(0);
			return;
		}

		const startTime = performance.now();
		let frameId = 0;

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
			setAnimatedPercent(usagePercentage * easeInOutCubic(progress));

			if (progress < 1) {
				frameId = requestAnimationFrame(animate);
			}
		};

		frameId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frameId);
	}, [loading, usagePercentage]);

	return (
		<div className="space-y-4 py-1">
			<div className="rounded-[1.75rem] bg-muted p-5">
				<div className="mb-5 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-foreground">
					<HardDrive className="size-4 text-muted-foreground" />
					<span>{usagePercentage.toFixed(1)}% занято</span>
				</div>

				<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex justify-center lg:w-44">
						<StorageUsageRing loading={loading} percent={animatedPercent} />
					</div>

					<div className="flex-1 space-y-3">
						<StorageMetric
							label="Used space"
							value={`${formatSize(usedSpaceBytes)} / ${formatSize(TOTAL_STORAGE_BYTES)}`}
						/>
						<StorageMetric
							label="Free space"
							value={formatSize(freeSpaceBytes)}
							valueClassName="font-medium text-emerald-600"
						/>
						<StorageMetric label="Files" value={totalFiles.toLocaleString()} />
					</div>
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
