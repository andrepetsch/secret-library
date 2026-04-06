import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the media ID from the params
    const id = params.id
    
    if (!id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 })
    }

    // Get the media item to verify access
    const media = await prisma.media.findUnique({
      where: { id },
      include: { files: true }
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Return the file URLs directly from the database
    const fileUrls = media.files.map(file => {
      return { ...file, url: file.fileUrl }
    })

    return NextResponse.json({ fileUrls })
  } catch (error) {
    console.error('Error generating file URLs:', error)
    return NextResponse.json({ error: 'Failed to generate file URLs' }, { status: 500 })
  }
}