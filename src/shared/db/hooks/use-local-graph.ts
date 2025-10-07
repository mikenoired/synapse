import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/shared/lib/auth-context'
import { LocalGraphRepository } from '../storage/graph.repository'
import { ensureDB } from './use-local-db'

const graphRepo = new LocalGraphRepository()

export function useLocalGraphData() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['local-graph'],
    queryFn: async () => {
      if (!user)
        return { nodes: [], edges: [] }

      await ensureDB()

      const nodes = await graphRepo.getAllNodes(user.id)
      const edges = await graphRepo.getAllEdges(user.id)

      return {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          content: node.content ?? '',
          metadata: node.metadata ? JSON.parse(node.metadata) : {},
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          from: edge.from_node,
          to: edge.to_node,
          type: edge.relation_type,
        })),
      }
    },
    enabled: !!user,
    staleTime: Number.POSITIVE_INFINITY,
  })
}
