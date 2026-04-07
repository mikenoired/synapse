import { Button, Input } from "@synapse/ui/components";
import { Palette } from "lucide-react";

export default function ThemingTab() {
	return (
		<div className="space-y-4 py-1">
			<div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground">
				<Palette className="size-4 text-muted-foreground" />
				<span>Тонкая настройка интерфейса</span>
			</div>

			<div className="space-y-4 rounded-[1.75rem] bg-muted p-5">
				<div className="space-y-2">
					<label className="block text-sm font-medium text-foreground">Palette</label>
					<Input value="Default" readOnly />
				</div>
				<div className="space-y-2">
					<label className="block text-sm font-medium text-foreground">Font</label>
					<Input value="Non Bureau" readOnly />
				</div>
				<Button className="w-full md:w-auto" disabled>
					Save (mock)
				</Button>
			</div>
		</div>
	);
}
