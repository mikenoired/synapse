import type { Context } from '../context'
import { handleSupabaseError } from '@/shared/lib/utils'

export default class GraphRepository {
  constructor(private readonly ctx: Context) { }

  async getNodes() {
    const { data, error } = await this.ctx.supabase
      .from('nodes')
      .select('id, content, type, metadata')
      .eq('user_id', this.ctx.user!.id)

    if (error)
      handleSupabaseError(error)
    return data
  }

  async getEdges() {
    const { data, error } = await this.ctx.supabase
      .from('edges')
      .select('*')
      .eq('user_id', this.ctx.user!.id)

    if (error)
      handleSupabaseError(error)
    return data
  }
}
