import { getPublicUrl, uploadFile } from '@/shared/api/minio'
import { createSupabaseClient } from '@/shared/api/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseClient(token)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('file') as File[]

    if (!files || !files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadResults = []
    const errors = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        if (!file.type.startsWith('image/')) {
          errors.push(`File "${file.name}" is not an image`)
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          errors.push(`File "${file.name}" is too large (max 10MB)`)
          continue
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const objectName = await uploadFile(buffer, file.name, file.type, user.id)
        const publicUrl = getPublicUrl(objectName)

        uploadResults.push({
          objectName,
          url: publicUrl,
          fileName: file.name,
          size: file.size,
          type: file.type
        })
      } catch (error) {
        errors.push(`Failed to upload "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (uploadResults.length > 0) {
      return NextResponse.json({
        success: true,
        files: uploadResults,
        errors: errors.length > 0 ? errors : undefined
      })
    } else {
      return NextResponse.json({
        error: 'No files uploaded successfully',
        details: errors
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
} 