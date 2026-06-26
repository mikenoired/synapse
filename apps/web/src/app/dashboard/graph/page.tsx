import { getServerCaller } from "@/server/getServerCaller";

import GraphClient from "./pageClient";

export default async function GraphPage() {
	const caller = await getServerCaller();
	const { nodes, edges } = await caller.graph.getGraph();
	return (
		<div>
			<div className="p-4 pb-0 flex justify-between items-center">
				<h1 className="text-2xl font-semibold">Связи</h1>
				<div className="flex gap-2 items-center">
					<span className="text-sm text-muted-foreground">Узлов: {nodes.length}</span>
					<span className="text-sm text-muted-foreground">Связей: {edges.length}</span>
				</div>
			</div>
			<GraphClient nodes={nodes || []} edges={edges || []} />
		</div>
	);
}
