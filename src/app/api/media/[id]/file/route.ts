import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve the params promise
    const { id: mediaId } = await params
    const url = new URL(request.url)
    const searchParams = url.searchParams
    const fileId = searchParams.get('fileId')
    
    if (!mediaId || !fileId) {
      return NextResponse.json(
        { error: 'Both mediaId and fileId are required' },
        { status: 400 }
      )
    }

    // Get the media item to verify access
    const media = await prisma.media.findUnique({
      where: {
        id: mediaId,
      },
      include: {
        files: {
          where: {
            id: fileId
          }
        }
      }
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Check if the user has access to this media
    if (media.uploadedBy !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Find the requested file
    const file = media.files[0]
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Check if this is a download request
    const isDownload = searchParams.get('download') === 'true'
    
    if (isDownload) {
      // For downloads, redirect to the file URL
      return NextResponse.redirect(file.fileUrl)
    }
    
    // Return the file URL
    return NextResponse.json({ url: file.fileUrl })
  } catch (error) {
    console.error('Error generating file URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate file URL' },
      { status: 500 }
    )
  }
}