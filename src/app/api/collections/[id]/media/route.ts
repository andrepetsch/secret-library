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
    const body = await req.json()
    const { mediaId } = body

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 })
    }

    // Verify collection exists and belongs to user
    const collection = await prisma.collection.findUnique({
      where: { id }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only modify your own collections' }, { status: 403 })
    }

    // Verify media exists and is not deleted
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        collections: {
          where: { id }
        }
      }
    })

    if (!media || media.deletedAt) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Check if media is already in the collection
    if (media.collections && media.collections.length > 0) {
      return NextResponse.json({ error: 'Media is already in this collection' }, { status: 400 })
    }

    // Add media to collection
    const updatedCollection = await prisma.collection.update({
      where: { id },
      data: {
        media: {
          connect: { id: mediaId }
        }
      },
      include: {
        media: {
          where: {
            deletedAt: null
          },
          include: {
            files: true,
            tags: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            media: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ collection: updatedCollection })
  } catch (error) {
    console.error('Error adding media to collection:', error)
    return NextResponse.json({ error: 'Failed to add media to collection' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const mediaId = searchParams.get('mediaId')

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 })
    }

    // Verify collection exists and belongs to user
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        media: {
          where: { id: mediaId }
        }
      }
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only modify your own collections' }, { status: 403 })
    }

    // Check if media is actually in the collection
    if (!collection.media || collection.media.length === 0) {
      return NextResponse.json({ error: 'Media is not in this collection' }, { status: 400 })
    }

    // Remove media from collection
    const updatedCollection = await prisma.collection.update({
      where: { id },
      data: {
        media: {
          disconnect: { id: mediaId }
        }
      },
      include: {
        media: {
          where: {
            deletedAt: null
          },
          include: {
            files: true,
            tags: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        _count: {
          select: {
            media: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ collection: updatedCollection })
  } catch (error) {
    console.error('Error removing media from collection:', error)
    return NextResponse.json({ error: 'Failed to remove media from collection' }, { status: 500 })
  }
}
