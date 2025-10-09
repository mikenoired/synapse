import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Note: WebSocket в Next.js требует custom server или использования внешнего WS сервера
// Для начала используем polling через обычные HTTP endpoints
// WebSocket можно добавить позже через custom server или отдельный WS сервер

export async function GET(_req: NextRequest) {
  return NextResponse.json({
    message: 'WebSocket endpoint - use /api/sync/push and /api/sync/pull for now',
  })
}
