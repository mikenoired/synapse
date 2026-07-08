"use client";

import { useEffect, useRef } from "react";

import { useDashboard } from "@/shared/lib/dashboard-context";

interface ContentFilterProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
}

export function ContentFilter({ searchQuery, setSearchQuery }: ContentFilterProps) {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const { setTriggerSearchFocus } = useDashboard();

	useEffect(() => {
		if (searchInputRef.current) setTriggerSearchFocus(() => searchInputRef.current?.focus);
	}, [setTriggerSearchFocus]);

	return (
		<div className="space-y-6 sticky top-0 bg-background z-10">
			<div className="relative rounded-lg border border-transparent border-b-border transition-[border-color,box-shadow] duration-150 focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_18%,transparent)]">
				<input
					ref={searchInputRef}
					id="search"
					type="text"
					placeholder="Поиск по названию и содержимому"
					aria-label="Поиск по материалам"
					value={searchQuery}
					autoFocus
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
					className="w-full rounded-[inherit] bg-background px-4 py-3 text-lg outline-none placeholder:text-muted-foreground sm:text-2xl"
				/>
			</div>
		</div>
	);
}
