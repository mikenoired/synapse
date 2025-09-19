import { getFileMetadata, getPresignedUrl } from '@/shared/api/minio'
import { createSupabaseClient } from '@/shared/api/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.nextUrl.searchParams.get('token') ||
      request.cookies.get('opi_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseClient(token)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { path } = await context.params
    const objectName = path.join('/')

    const metadata = await getFileMetadata(objectName)
    if (!metadata) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const pathUserId = objectName.split('/')[1] // images/userId/filename
    if (metadata.userId !== user.id && pathUserId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем presigned URL
    const presignedUrl = await getPresignedUrl(objectName, 60 * 60) // 1 час
    return NextResponse.json({ presignedUrl })
  } catch (error) {
    console.error('File access error:', error)
    return NextResponse.json(
      { error: 'File access failed' },
      { status: 500 }
    )
  }
} 