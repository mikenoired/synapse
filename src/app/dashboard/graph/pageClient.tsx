'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Json } from '@/shared/types/database';

type NodeMetadata = {
  content_id: string;
} | {
  tag_id: string;
}

type Node = { id: string; content: string | null; type: string; created_at?: string | null; updated_at?: string | null, metadata?: Json | null }
type Edge = { id?: string; from_node: string | null; to_node: string | null; relation_type: string }

export default function GraphClient({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()

  const data = useMemo(() => {
    const links = edges
      .filter(e => e.from_node && e.to_node)
      .map(e => ({ source: e.from_node as string, target: e.to_node as string }))
    const degree: Record<string, number> = {}
    links.forEach(l => {
      degree[l.source] = (degree[l.source] || 0) + 1
      degree[l.target] = (degree[l.target] || 0) + 1
    })
    return { nodes: nodes.map(n => ({ id: n.id, label: n.content || "", type: n.type, metadata: n.metadata })), links, degree }
  }, [nodes, edges])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const DPR = window.devicePixelRatio || 1
    const resize = () => {
      canvas.width = canvas.clientWidth * DPR
      canvas.height = canvas.clientHeight * DPR
    }
    resize()

    let raf = 0
    const N = data.nodes.length
    const pos: Record<string, { x: number; y: number; vx: number; vy: number }> = {}
    data.nodes.forEach((n, i) => {
      pos[n.id] = { x: (i / N) * canvas.width, y: (i % N) * (canvas.height / N), vx: 0, vy: 0 }
    })

    let dragging: { id: string; ox: number; oy: number; moved: boolean } | null = null
    let hovering: string | null = null
    const getPointer = (evt: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = (evt.clientX - rect.left) * DPR
      const y = (evt.clientY - rect.top) * DPR
      return { x, y }
    }
    const findNearest = (x: number, y: number) => {
      let best: { id: string; d2: number } | null = null
      for (const n of data.nodes) {
        const p = pos[n.id]
        const dx = p.x - x
        const dy = p.y - y
        const d2 = dx * dx + dy * dy
        if (!best || d2 < best.d2) best = { id: n.id, d2 }
      }
      const r = 20 * DPR
      return best && best.d2 < r * r ? best.id : null
    }
    const onPointerDown = (e: PointerEvent) => {
      const { x, y } = getPointer(e)
      const id = findNearest(x, y)
      if (!id) return
      const p = pos[id]
      dragging = { id, ox: p.x - x, oy: p.y - y, moved: false }
      canvas.style.cursor = 'grabbing'
      canvas.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      const { x, y } = getPointer(e)
      const id = findNearest(x, y)

      if (id !== hovering) {
        hovering = id
        if (id) {
          const node = data.nodes.find(n => n.id === id)
          if (node?.type === 'tag') {
            canvas.style.cursor = 'pointer'
          } else {
            canvas.style.cursor = dragging ? 'grabbing' : 'grab'
          }
        } else {
          canvas.style.cursor = 'default'
        }
      }

      if (!dragging) return
      const p = pos[dragging.id]
      const newX = x + dragging.ox
      const newY = y + dragging.oy
      const dx = Math.abs(newX - p.x)
      const dy = Math.abs(newY - p.y)
      if (dx > 2 || dy > 2) dragging.moved = true
      p.x = newX
      p.y = newY
      p.vx = 0; p.vy = 0
    }
    const onPointerUp = (e: PointerEvent) => {
      const wasClick = dragging && !dragging.moved
      const draggedNodeId = dragging?.id
      dragging = null

      const { x, y } = getPointer(e)
      const id = findNearest(x, y)
      if (id) {
        const node = data.nodes.find(n => n.id === id)
        if (node?.type === 'tag') {
          canvas.style.cursor = 'pointer'
        } else {
          canvas.style.cursor = 'grab'
        }
      } else {
        canvas.style.cursor = 'default'
      }

      try { canvas.releasePointerCapture(e.pointerId) } catch {
        // ignore
      }

      if (wasClick && draggedNodeId) {
        const node = data.nodes.find(n => n.id === draggedNodeId)
        if (node?.type === 'tag' && node.metadata) {
          console.log(node.metadata);
          const metadata = node.metadata as NodeMetadata
          if ('tag_id' in metadata) {
            router.push(`/dashboard/tag/${metadata.tag_id}`)
          }
        }
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    const step = () => {
      for (const l of data.links) {
        const a = pos[l.source]
        const b = pos[l.target]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy) || 1
        const k = 0.015
        const fx = (dx / dist) * k * (dist - 120)
        const fy = (dy / dist) * k * (dist - 120)
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      }
      // repulsion
      for (let i = 0; i < data.nodes.length; i++) {
        for (let j = i + 1; j < data.nodes.length; j++) {
          const a = pos[data.nodes[i].id]
          const b = pos[data.nodes[j].id]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist2 = dx * dx + dy * dy + 0.01
          const da = data.degree[data.nodes[i].id] || 0
          const db = data.degree[data.nodes[j].id] || 0
          const base = (da === 0 || db === 0) ? 800 : 5000
          const rep = base / dist2
          const fx = (dx / Math.sqrt(dist2)) * rep
          const fy = (dy / Math.sqrt(dist2)) * rep
          a.vx -= fx; a.vy -= fy
          b.vx += fx; b.vy += fy
        }
      }
      // gently pull isolated nodes toward center so they don't fly away
      const cx = canvas.width / 2, cy = canvas.height / 2
      for (const n of data.nodes) {
        const deg = data.degree[n.id] || 0
        if (deg === 0) {
          const p = pos[n.id]
          p.vx += (cx - p.x) * 0.0008
          p.vy += (cy - p.y) * 0.0008
        }
      }
      // density-aware push for nodes near a dragged node
      if (dragging) {
        const pid = dragging.id
        const p = pos[pid]
        for (const n of data.nodes) {
          if (n.id === pid) continue
          const q = pos[n.id]
          const dx = q.x - p.x
          const dy = q.y - p.y
          const d2 = dx * dx + dy * dy + 0.01
          if (d2 < (140 * DPR) * (140 * DPR)) {
            const k = 12000 / d2
            const fx = (dx / Math.sqrt(d2)) * k
            const fy = (dy / Math.sqrt(d2)) * k
            q.vx += fx; q.vy += fy
          }
        }
      }
      // integrate
      for (const n of data.nodes) {
        const p = pos[n.id]
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.9; p.vy *= 0.9
        p.x = Math.max(20, Math.min(canvas.width - 20, p.x))
        p.y = Math.max(20, Math.min(canvas.height - 20, p.y))
      }
      // draw
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save(); ctx.scale(DPR, DPR)
      ctx.strokeStyle = 'rgba(100,100,100,0.6)'
      data.links.forEach(l => {
        const a = pos[l.source]
        const b = pos[l.target]
        ctx.beginPath(); ctx.moveTo(a.x / DPR, a.y / DPR); ctx.lineTo(b.x / DPR, b.y / DPR); ctx.stroke()
      })
      data.nodes.forEach(n => {
        const p = pos[n.id]
        ctx.beginPath();
        ctx.fillStyle = n.type === 'tag' ? '#FF523B' : '#6b7280';
        ctx.arc(p.x / DPR, p.y / DPR, 6, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#111827';
        ctx.font = '12px sans-serif';
        ctx.fillText(n.label, p.x / DPR + 8, p.y / DPR + 4)
      })
      ctx.restore()
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
    }
  }, [data, router])

  return (
    <div className="flex h-full w-full p-4">
      <canvas ref={canvasRef} className="w-full h-[calc(100vh-6rem)] rounded border" />
    </div>
  )
}


