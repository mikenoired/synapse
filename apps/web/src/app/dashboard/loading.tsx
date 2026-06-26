import { ItemSkeleton } from "@/entities/item/ui/skeleton";
import { ContentFilterSkeleton } from "@/features/content-filter/skeleton";

export default function DashboardLoading() {
	return (
		<div className="flex h-full flex-col">
			<ContentFilterSkeleton />
			<div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{Array.from({ length: 12 }).map((_, index) => (
					<ItemSkeleton key={index} />
				))}
			</div>
		</div>
	);
}
