import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getObjectStream } from '@/lib/s3'
import { Readable } from 'stream'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, fileId } = await params

    // Verify media exists and is accessible
    const media = await prisma.media.findUnique({
      where: { id, deletedAt: null },
      include: { files: true }
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    const file = media.files.find((f: { id: string }) => f.id === fileId)
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Fetch file from S3
    const s3Response = await getObjectStream(file.fileUrl)

    if (!s3Response.Body) {
      return NextResponse.json({ error: 'File content unavailable' }, { status: 502 })
    }

    const contentType = file.fileUrl.endsWith('.epub')
      ? 'application/epub+zip'
      : 'application/pdf'

    const isDownload = req.nextUrl.searchParams.get('download') === 'true'
    const safeTitle = media.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
    const ext = file.fileUrl.endsWith('.epub') ? 'epub' : 'pdf'
    const filename = `${safeTitle}.${ext}`

    const headers = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': isDownload
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`,
    })

    if (s3Response.ContentLength) {
      headers.set('Content-Length', String(s3Response.ContentLength))
    }

    // Stream body from S3 to the response
    const nodeStream = s3Response.Body as Readable
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
        nodeStream.on('end', () => controller.close())
        nodeStream.on('error', (err) => controller.error(err))
      },
      cancel() {
        nodeStream.destroy()
      }
    })

    return new NextResponse(webStream, { headers })
  } catch (error) {
    console.error('Error serving file from S3:', error)
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 })
  }
}
