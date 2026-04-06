import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPresignedUploadUrl } from '@/lib/s3'
import { nanoid } from 'nanoid'

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'application/epub+zip']

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { filename, contentType } = body

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'filename and contentType are required' }, { status: 400 })
    }

    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json({ error: 'Only EPUB and PDF files are allowed' }, { status: 400 })
    }

    const ext = contentType === 'application/epub+zip' ? 'epub' : 'pdf'
    const s3Key = `uploads/${session.user.id}/${nanoid()}.${ext}`

    const presignedUrl = await getPresignedUploadUrl(s3Key, contentType)

    return NextResponse.json({ presignedUrl, s3Key })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
