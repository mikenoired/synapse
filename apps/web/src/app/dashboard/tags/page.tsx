import { redirect } from "next/navigation";

import { createContext } from "@/server/context";
import { getServerCaller } from "@/server/getServerCaller";

import TagsClient from "./page.client";

export default async function TagsPage() {
	const { user } = await createContext({});

	if (!user) {
		redirect("/");
	}

	const caller = await getServerCaller();
	const initial = await caller.content.getTagsWithContent();

	return <TagsClient initial={initial} />;
}
