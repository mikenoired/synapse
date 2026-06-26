import { getServerCaller } from "@/server/getServerCaller";

import TagsClient from "./page.client";

export default async function TagsPage() {
	const caller = await getServerCaller();
	const initial = await caller.content.getTagsWithContent();

	return <TagsClient initial={initial} />;
}
