import { eq } from "drizzle-orm";

import type { Context } from "../context";
import { edges, nodes } from "../db/schema";
import { requireAuth } from "../lib/auth-guard";

export default class GraphRepository {
	constructor(private readonly ctx: Context) {}

	async getNodes() {
		requireAuth(this.ctx);

		const data = await this.ctx.db.query.nodes.findMany({
			where: eq(nodes.userId, this.ctx.user.id),
			columns: {
				id: true,
				content: true,
				type: true,
				metadata: true,
			},
		});

		return data;
	}

	async getEdges() {
		requireAuth(this.ctx);

		const data = await this.ctx.db.query.edges.findMany({
			where: eq(edges.userId, this.ctx.user.id),
		});

		return data;
	}
}
