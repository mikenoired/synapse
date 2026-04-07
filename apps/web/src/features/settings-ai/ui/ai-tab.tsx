import { Sparkles } from "lucide-react";

export default function AiTab() {
	const used = 12000;
	const quota = 20000;
	const percent = Math.round((used / quota) * 100);

	return (
		<div className="space-y-4 py-1">
			<div className="rounded-[1.75rem] bg-muted p-5">
				<div className="mb-4 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-foreground">
					<Sparkles className="size-4 text-muted-foreground" />
					<span>{percent}% лимита за месяц</span>
				</div>

				<div className="space-y-3 text-sm">
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Used tokens</span>
						<span className="font-medium text-foreground">{used.toLocaleString()}</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-muted-foreground">Monthly quota</span>
						<span className="font-medium text-foreground">{quota.toLocaleString()}</span>
					</div>
					<div className="mt-1 h-2.5 overflow-hidden rounded-full bg-background">
						<div
							className="h-full rounded-full bg-foreground transition-all duration-500"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<p className="text-sm leading-6 text-muted-foreground">
						Статистика пока остаётся моковой, но внутри модалки она стала компактнее и не ломает ритм
						интерфейса.
					</p>
				</div>
			</div>
		</div>
	);
}
