import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendToKindleEmail, validateEmailConfig } from '@/lib/email'

interface MediaFileRecord {
  id: string
  fileType: string
  fileUrl: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check email configuration
    if (!validateEmailConfig()) {
      return NextResponse.json(
        { error: 'Email is not configured on this server' },
        { status: 503 }
      )
    }

    // Get the current user's Kindle email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { kindleEmail: true },
    })

    if (!user?.kindleEmail) {
      return NextResponse.json(
        { error: 'No Kindle email address configured. Please add one in your settings.' },
        { status: 400 }
      )
    }

    const { id } = await params

    // Fetch media with its files
    const media = await prisma.media.findUnique({
      where: { id, deletedAt: null },
      include: { files: true },
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    if (media.files.length === 0) {
      return NextResponse.json({ error: 'No files available for this media' }, { status: 400 })
    }

    // Prefer EPUB over PDF for Kindle
    const epubFile = media.files.find((f: MediaFileRecord) => f.fileType === 'epub')
    const pdfFile = media.files.find((f: MediaFileRecord) => f.fileType === 'pdf')
    const fileToSend = epubFile || pdfFile

    if (!fileToSend) {
      return NextResponse.json({ error: 'No suitable file found' }, { status: 400 })
    }

    // Fetch the file content from Vercel Blob
    const fileResponse = await fetch(fileToSend.fileUrl)
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Failed to retrieve the file' }, { status: 502 })
    }

    const arrayBuffer = await fileResponse.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Build a clean file name from the book title
    const safeTitle = media.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
    const fileName = `${safeTitle}.${fileToSend.fileType}`

    await sendToKindleEmail({
      kindleEmail: user.kindleEmail,
      bookTitle: media.title,
      fileBuffer,
      fileName,
    })

    return NextResponse.json({
      message: `"${media.title}" has been sent to your Kindle (${user.kindleEmail})`,
      fileType: fileToSend.fileType,
    })
  } catch (error) {
    console.error('Error sending to Kindle:', error)
    return NextResponse.json({ error: 'Failed to send to Kindle' }, { status: 500 })
  }
}
