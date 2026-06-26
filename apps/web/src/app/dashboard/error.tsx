"use client";

import { Button } from "@synapse/ui/components";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
	return (
		<div className="flex h-full items-center justify-center p-6 text-center">
			<div className="max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
				<div>
					<h2 className="text-lg font-semibold">Не удалось загрузить данные</h2>
					<p className="mt-2 text-sm text-muted-foreground">Попробуйте повторить запрос.</p>
				</div>
				<Button onClick={reset}>Повторить</Button>
			</div>
		</div>
	);
}
