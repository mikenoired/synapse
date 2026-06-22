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
			<div className="relative">
				<input
					ref={searchInputRef}
					id="search"
					type="text"
					placeholder="Поиск по названию и содержимому"
					aria-label="Поиск по материалам"
					value={searchQuery}
					autoFocus
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
					className="w-full bg-background px-4 py-3 text-lg sm:text-2xl border-b outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
				/>
			</div>
		</div>
	);
}
