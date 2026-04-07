"use client";

import { Button } from "@synapse/ui/components";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Item from "@/entities/item/ui/item";
import type { Content } from "@/shared/lib/schemas";

export default function ItemPageClient({ initialItem }: { initialItem: Content }) {
	const [item, setItem] = useState(initialItem);
	const router = useRouter();

	return (
		<div className="container mx-auto p-4">
			<Button onClick={() => router.back()} variant="ghost" className="mb-4">
				<ArrowLeft className="mr-2 h-4 w-4" />
				Back
			</Button>
			<Item
				item={item}
				index={0}
				onContentUpdated={setItem}
				onContentDeleted={() => router.push("/dashboard")}
			/>
		</div>
	);
}
