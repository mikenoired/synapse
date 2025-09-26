import GraphService from '@/server/services/graph.service'
import { protectedProcedure, router } from '../trpc'

export const graphRouter = router({
  getGraph: protectedProcedure.query(async ({ ctx }) => {
    const service = new GraphService(ctx)
    return await service.getGraph()
  }),
})
