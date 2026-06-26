"use client";

import { useEffect, useMemo, useRef } from "react";

import { createGraph, type GraphInput } from "./graph";

interface Node {
	id: string;
	content: string | null;
	type: string;
	metadata?: unknown;
}

interface Edge {
	fromNode: string | null;
	toNode: string | null;
}

export default function GraphClient({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
	const graphRef = useRef<HTMLDivElement>(null);
	const graphData = useGraphData(nodes, edges);

	useEffect(() => {
		if (!graphRef.current) return;
		const graph = createGraph(graphRef.current, graphData);
		return () => graph.destroy();
	}, [graphData]);

	return (
		<div className="h-[calc(100vh-6rem)] w-full p-4">
			<div ref={graphRef} className="h-full w-full overflow-hidden rounded border bg-background" />
		</div>
	);
}

function useGraphData(nodes: Node[], edges: Edge[]) {
	return useMemo<GraphInput>(() => {
		const byId = new Map(
			nodes.map((node) => [
				node.id,
				{
					id: node.id,
					label: node.content || "Без названия",
					links: [] as string[],
					type: node.type,
					href: getTagHref(node),
				},
			])
		);

		for (const edge of edges) {
			if (!edge.fromNode || !edge.toNode) continue;
			const source = byId.get(edge.fromNode);
			if (source && byId.has(edge.toNode)) source.links.push(edge.toNode);
		}

		return { nodes: [...byId.values()] };
	}, [nodes, edges]);
}

function getTagHref(node: Node) {
	if (node.type !== "tag") return undefined;
	if (!node.metadata || typeof node.metadata !== "object" || !("tag_id" in node.metadata)) return undefined;
	const tagId = node.metadata.tag_id;
	return typeof tagId === "string" ? `/dashboard/tag/${tagId}` : undefined;
}
