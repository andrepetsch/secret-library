import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Upload } from '@aws-sdk/lib-storage'
import { s3, getS3Bucket } from '@/lib/s3'
import { nanoid } from 'nanoid'

const ALLOWED_CONTENT_TYPES = ['application/pdf', 'application/epub+zip']

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only EPUB and PDF files are allowed' }, { status: 400 })
    }

    const ext = file.type === 'application/epub+zip' ? 'epub' : 'pdf'
    const s3Key = `uploads/${session.user.id}/${nanoid()}.${ext}`

    const upload = new Upload({
      client: s3(),
      params: {
        Bucket: getS3Bucket(),
        Key: s3Key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
      },
    })

    await upload.done()

    return NextResponse.json({ s3Key })
  } catch (error) {
    console.error('Error uploading file to S3:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
