"use server";

import { redirect } from "next/navigation";

import { createContext } from "@/server/context";
import { getServerCaller } from "@/server/getServerCaller";

import GraphClient from "./pageClient";

export default async function GraphPage() {
	const ctx = await createContext({});
	if (!ctx.user) redirect("/");
	const caller = await getServerCaller();
	const { nodes, edges } = await caller.graph.getGraph();
	return (
		<div>
			<div className="p-4 pb-0 flex justify-between items-center">
				<h1 className="text-2xl font-semibold">Graph</h1>
				<div className="flex gap-2 items-center">
					<span className="text-sm text-muted-foreground">{nodes.length} nodes</span>
					<span className="text-sm text-muted-foreground">{edges.length} edges</span>
				</div>
			</div>
			<GraphClient nodes={nodes || []} edges={edges || []} />
		</div>
	);
}
