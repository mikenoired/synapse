import type { Context } from '../context'
import { TRPCError } from '@trpc/server'
import { eq } from 'drizzle-orm'
import { edges, nodes } from '../db/schema'

export default class GraphRepository {
  constructor(private readonly ctx: Context) { }

  async getNodes() {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const data = await this.ctx.db.query.nodes.findMany({
      where: eq(nodes.userId, this.ctx.user.id),
      columns: {
        id: true,
        content: true,
        type: true,
        metadata: true,
      },
    })

    return data
  }

  async getEdges() {
    if (!this.ctx.user)
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Unauthorized' })

    const data = await this.ctx.db.query.edges.findMany({
      where: eq(edges.userId, this.ctx.user.id),
    })

    return data
  }
}
