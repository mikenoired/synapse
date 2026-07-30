import { getServerCaller } from "@/server/getServerCaller";

import TagsClient from "./page.client";

export default async function TagsPage() {
	const caller = await getServerCaller();
	const initial = await caller.content.getTagsWithContentPage({ limit: 24 });

	return <TagsClient initial={initial} />;
}
