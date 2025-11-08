import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const media = await prisma.media.findUnique({
      where: { id },
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
    })

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}

export async function PUT(
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
    const { title, author, description, publicationDate, language, tags, mediaType } = body

    // Check if media exists and user has permission
    const existingMedia = await prisma.media.findUnique({
      where: { id },
      include: { tags: true, files: true }
    })

    if (!existingMedia) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    if (existingMedia.uploadedBy !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own media' }, { status: 403 })
    }

    // Validate media type if provided
    const allowedMediaTypes = ['Book', 'Magazine', 'Paper', 'Article']
    const validatedMediaType = mediaType && allowedMediaTypes.includes(mediaType) ? mediaType : existingMedia.mediaType

    // Update media record
    await prisma.media.update({
      where: { id },
      data: {
        title: title || existingMedia.title,
        author: author !== undefined ? author : existingMedia.author,
        description: description !== undefined ? description : existingMedia.description,
        publicationDate: publicationDate !== undefined ? publicationDate : existingMedia.publicationDate,
        language: language !== undefined ? language : existingMedia.language,
        mediaType: validatedMediaType,
      }
    })

    // Handle tags update if provided
    if (tags !== undefined) {
      // Disconnect all existing tags
      await prisma.media.update({
        where: { id },
        data: {
          tags: {
            disconnect: existingMedia.tags.map((tag: { id: string }) => ({ id: tag.id }))
          }
        }
      })

      // Connect new tags
      if (tags && tags.length > 0) {
        const tagNames = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        
        if (tagNames.length > 0) {
          const tagPromises = tagNames.map(async (tagName: string) => {
            return prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName }
            })
          })
          
          const createdTags = await Promise.all(tagPromises)
          
          await prisma.media.update({
            where: { id },
            data: {
              tags: {
                connect: createdTags.map(tag => ({ id: tag.id }))
              }
            }
          })
        }
      }
    }

    // Fetch updated media with tags
    const finalMedia = await prisma.media.findUnique({
      where: { id },
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
    })

    return NextResponse.json({ media: finalMedia })
  } catch (error) {
    console.error('Error updating media:', error)
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 })
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

    // Check if media exists and user has permission
    const existingMedia = await prisma.media.findUnique({
      where: { id }
    })

    if (!existingMedia) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    if (existingMedia.uploadedBy !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own media' }, { status: 403 })
    }

    // Soft delete by setting deletedAt timestamp
    const deletedMedia = await prisma.media.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    })

    return NextResponse.json({ 
      message: 'Media soft deleted successfully',
      media: deletedMedia 
    })
  } catch (error) {
    console.error('Error deleting media:', error)
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 })
  }
}
