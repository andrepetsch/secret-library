import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      blobUrl,
      contentType,
      mediaId,
      title,
      author,
      description,
      publicationDate,
      language,
      mediaType,
      tags
    } = body

    if (!blobUrl) {
      return NextResponse.json({ error: 'Blob URL is required' }, { status: 400 })
    }

    // Determine file type from content type
    const fileType = contentType === 'application/epub+zip' ? 'epub' : 'pdf'

    let media

    // Check if adding to existing media
    if (mediaId) {
      // Verify media exists and user owns it
      const existingMedia = await prisma.media.findUnique({
        where: { id: mediaId },
        include: { files: true }
      })

      if (!existingMedia) {
        return NextResponse.json({ error: 'Media not found' }, { status: 404 })
      }

      if (existingMedia.uploadedBy !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden: You can only add files to your own media' }, { status: 403 })
      }

      // Check if file type already exists
      const existingFileType = existingMedia.files.find((f: { fileType: string }) => f.fileType === fileType)
      if (existingFileType) {
        return NextResponse.json({ error: `A ${fileType.toUpperCase()} file already exists for this media` }, { status: 400 })
      }

      // Add file to existing media
      await prisma.mediaFile.create({
        data: {
          mediaId: mediaId,
          fileUrl: blobUrl,
          fileType: fileType
        }
      })

      media = await prisma.media.findUnique({
        where: { id: mediaId },
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
    } else {
      // Create new media record with file
      if (!title) {
        return NextResponse.json({ error: 'Title is required for new media' }, { status: 400 })
      }

      const allowedMediaTypes = ['Book', 'Magazine', 'Paper', 'Article']
      const validatedMediaType = mediaType && allowedMediaTypes.includes(mediaType) ? mediaType : 'Book'

      media = await prisma.media.create({
        data: {
          title,
          author: author || null,
          description: description || null,
          publicationDate: publicationDate || null,
          language: language || null,
          mediaType: validatedMediaType,
          uploadedBy: session.user.id,
          files: {
            create: {
              fileUrl: blobUrl,
              fileType: fileType
            }
          }
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
      })

      // Handle tags
      if (tags) {
        const tagNames = tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        
        if (tagNames.length > 0) {
          // Find or create all tags in batch
          const tagPromises = tagNames.map(async (tagName: string) => {
            return prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName }
            })
          })
          
          const createdTags = await Promise.all(tagPromises)
          
          // Connect all tags to media in one operation
          await prisma.media.update({
            where: { id: media.id },
            data: {
              tags: {
                connect: createdTags.map(tag => ({ id: tag.id }))
              }
            }
          })
          
          // Fetch updated media with tags
          media = await prisma.media.findUnique({
            where: { id: media.id },
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
        }
      }
    }

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error creating media from blob:', error)
    return NextResponse.json({ error: 'Failed to create media record' }, { status: 500 })
  }
}
