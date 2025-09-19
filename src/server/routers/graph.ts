import { handleSupabaseError } from "@/shared/lib/utils"
import { protectedProcedure, router } from "../trpc"

export const graphRouter = router({
  getGraph: protectedProcedure.query(async ({ ctx }) => {
    const { data: nodes, error: nodesError } = await ctx.supabase
      .from('nodes')
      .select('id, content, type, metadata')
      .eq('user_id', ctx.user.id)
    if (nodesError) handleSupabaseError(nodesError)
    const { data: edges, error: edgesError } = await ctx.supabase
      .from('edges')
      .select('*')
      .eq('user_id', ctx.user.id)
    if (edgesError) handleSupabaseError(edgesError)
    return { nodes, edges }
  }),
})