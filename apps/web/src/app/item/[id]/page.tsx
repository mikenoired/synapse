import { redirect } from "next/navigation";

import { createContext } from "@/server/context";
import { getServerCaller } from "@/server/getServerCaller";

import ItemPageClient from "./page-client";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
	const ctx = await createContext({});
	const { user } = ctx;

	if (!user) {
		redirect("/");
	}

	const { id } = await params;
	const caller = await getServerCaller(ctx);
	const item = await caller.content.getById({ id });

	return <ItemPageClient initialItem={item} />;
}
