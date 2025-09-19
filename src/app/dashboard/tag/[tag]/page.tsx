import { createContext } from '@/server/context'
import { getServerCaller } from '@/server/getServerCaller'
import TagClient from './page.client'

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)

  const ctx = await createContext({})
  if (!ctx.user) {
    return (
      <TagClient tag={decodedTag} initial={{ items: [], nextCursor: undefined }} />
    )
  }

  const caller = await getServerCaller()
  // NOTE: expecting tag to be an id now for fast filtering
  const initial = await caller.content.getAll({ tagIds: [decodedTag], limit: 20 })

  return <TagClient tag={decodedTag} initial={initial} />
}