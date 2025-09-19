'use server'

import { getServerCaller } from '@/server/getServerCaller'
import { createContext } from '@/server/context'
import GraphClient from './pageClient'
import { numWord } from '@/shared/lib/utils'

export default async function GraphPage() {
  const ctx = await createContext({})
  if (!ctx.user) return null
  const caller = await getServerCaller()
  const { nodes, edges } = await caller.graph.getGraph()
  return <div>
    <div className='p-4 pb-0 flex justify-between items-center'>
      <h1 className="text-2xl font-semibold">Граф</h1>
      <div className='flex gap-2 items-center'>
        <span className='text-sm text-muted-foreground'>{nodes.length} {numWord(nodes.length, ['узел', 'узла', 'узлов'])}</span>
        <span className='text-sm text-muted-foreground'>{edges.length} {numWord(edges.length, ['ребро', 'ребра', 'ребер'])}</span>
      </div>
    </div>
    <GraphClient nodes={nodes || []} edges={edges || []} />
  </div>
}


