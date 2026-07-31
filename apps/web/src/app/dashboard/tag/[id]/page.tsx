import { getServerCaller } from "@/server/getServerCaller";

import TagClient from "./page.client";

export default async function TagPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;

	const caller = await getServerCaller();
	const [tagData, initial] = await Promise.all([
		caller.content.getTagById({ id }),
		caller.content.getAll({ tagIds: [id], limit: 20 }),
	]);

	return (
		<TagClient
			tagId={id}
			tagTitle={tagData?.title || ""}
			initialColor={tagData?.color ?? 0}
			initial={initial}
		/>
	);
}
