import { getFile, getFileMetadata } from '@/shared/api/minio'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const objectName = params.path.join('/')

    const metadata = await getFileMetadata(objectName)
    if (!metadata) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const pathUserId = objectName.split('/')[1] // images/userId/filename
    if (metadata.userId !== user.id && pathUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { stream, contentType } = await getFile(objectName)

    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        stream.on('end', () => {
          controller.close()
        })

        stream.on('error', (error) => {
          controller.error(error)
        })
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': metadata.size.toString(),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('File access error:', error)
    return NextResponse.json(
      { error: 'File access failed' },
      { status: 500 }
    )
  }
} 