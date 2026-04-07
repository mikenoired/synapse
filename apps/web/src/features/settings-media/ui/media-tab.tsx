"use client";

import { useEffect, useState } from "react";

import { trpc } from "@/shared/api/trpc";
import { useUserPreferences } from "@/shared/lib/user-preferences-context";
import { formatSize } from "@/shared/lib/utils";

export default function MediaTab() {
	const { data: storageUsage } = trpc.user.getStorageUsage.useQuery();
	const { isReady, mediaAutoplayEnabled, setMediaAutoplayEnabled } = useUserPreferences();
	const { fileSize, files } = storageUsage || { fileSize: 0, files: 0 };

	const totalSpaceBytes = 1000 * 1024 * 1024 * 1024; // 1000 GB in bytes
	const usedSpaceBytes = fileSize || 0; // bytes from API
	const freeSpaceBytes = totalSpaceBytes - usedSpaceBytes;
	const totalFiles = files || 0;
	const usagePercentage = (usedSpaceBytes / totalSpaceBytes) * 100;

	const [loading, setLoading] = useState(true);
	const [animatedPercent, setAnimatedPercent] = useState(0);

	useEffect(() => {
		setTimeout(() => setLoading(false), 500);
	}, []);

	useEffect(() => {
		if (!loading) {
			const duration = 700;
			const startValue = 0;
			const endValue = usagePercentage;
			const startTime = performance.now();
			function animate(now: number) {
				const elapsed = now - startTime;
				const progress = Math.min(elapsed / duration, 1);
				const eased = easeInOutCubic(progress);
				const current = startValue + (endValue - startValue) * eased;
				setAnimatedPercent(current);
				if (progress < 1) requestAnimationFrame(animate);
			}
			requestAnimationFrame(animate);
		} else {
			setAnimatedPercent(0);
		}
	}, [loading, usagePercentage]);

	function getRingColor(percent: number) {
		if (percent < 60) return "#22c55e";
		if (percent < 85) return "#eab308";
		return "#ef4444";
	}

	function easeInOutCubic(t: number) {
		return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
	}

	const formatNumber = (num: number) => {
		return num.toLocaleString();
	};

	return (
		<div className="space-y-4 bg-muted p-6">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-foreground">Storage Usage</h2>
				<span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
					{usagePercentage.toFixed(1)}% used
				</span>
			</div>
			<div className="flex flex-row items-center justify-between gap-4">
				<div className="flex justify-center w-full max-w-[220px] mx-auto">
					{loading ? (
						<div className="animate-pulse w-[180px] h-[180px] rounded-full bg-muted/60" />
					) : (
						<svg width="180" height="180" viewBox="0 0 180 180" style={{ maxWidth: 220, display: "block" }}>
							<circle cx="90" cy="90" r="80" fill="none" stroke="var(--muted)" strokeWidth="18" />
							<circle
								cx="90"
								cy="90"
								r="80"
								fill="none"
								stroke={getRingColor(animatedPercent)}
								strokeWidth="18"
								strokeDasharray={2 * Math.PI * 80}
								strokeDashoffset={2 * Math.PI * 80 * (1 - animatedPercent / 100)}
								strokeLinecap="round"
								style={{
									filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.08))",
								}}
							/>
							<text
								x="50%"
								y="50%"
								textAnchor="middle"
								dominantBaseline="central"
								fontSize="2.2rem"
								fontWeight="bold"
								fill="var(--foreground)">
								{Math.round(animatedPercent)}%
							</text>
						</svg>
					)}
				</div>

				<div className="space-y-4 flex-1">
					<div className="flex justify-between items-center gap-2">
						<span className="text-muted-foreground">Used Space</span>
						<div className="h-px w-full bg-border flex-1"></div>
						<span className="font-semibold text-foreground">
							{formatSize(usedSpaceBytes)} /{formatSize(totalSpaceBytes)}
						</span>
					</div>

					<div className="flex justify-between items-center gap-2">
						<span className="text-muted-foreground">Free Space</span>
						<div className="h-px w-full bg-border flex-1"></div>
						<span className="font-semibold text-green-600">{formatSize(freeSpaceBytes)}</span>
					</div>

					<div className="flex justify-between items-center gap-2">
						<span className="text-muted-foreground">Total Files</span>
						<div className="h-px w-full bg-border flex-1"></div>
						<span className="font-semibold text-foreground">{formatNumber(totalFiles)}</span>
					</div>
				</div>
			</div>

			<div className="rounded-2xl border border-border bg-background p-5">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h3 className="text-base font-semibold text-foreground">Autoplay media on open</h3>
						<p className="text-sm text-muted-foreground">
							Automatically starts audio and video when you open them in the viewer.
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={mediaAutoplayEnabled}
						disabled={!isReady}
						onClick={() => setMediaAutoplayEnabled(!mediaAutoplayEnabled)}
						className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${mediaAutoplayEnabled ? "border-foreground bg-foreground" : "border-border bg-muted"} ${!isReady ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
						<span
							className={`inline-block size-5 rounded-full bg-background transition-transform ${mediaAutoplayEnabled ? "translate-x-6" : "translate-x-1"}`}
						/>
					</button>
				</div>
			</div>
		</div>
	);
}
