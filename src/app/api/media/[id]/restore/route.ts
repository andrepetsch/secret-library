import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if media exists and user has permission
    const existingMedia = await prisma.media.findUnique({
      where: { id }
    })

    if (!existingMedia) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    if (existingMedia.uploadedBy !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only restore your own media' }, { status: 403 })
    }

    if (!existingMedia.deletedAt) {
      return NextResponse.json({ error: 'Media is not deleted' }, { status: 400 })
    }

    // Restore by clearing deletedAt timestamp
    const restoredMedia = await prisma.media.update({
      where: { id },
      data: {
        deletedAt: null
      },
      include: {
        tags: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({ 
      message: 'Media restored successfully',
      media: restoredMedia 
    })
  } catch (error) {
    console.error('Error restoring media:', error)
    return NextResponse.json({ error: 'Failed to restore media' }, { status: 500 })
  }
}
