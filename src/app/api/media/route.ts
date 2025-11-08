import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const author = formData.get('author') as string | null
    const description = formData.get('description') as string | null
    const publicationDate = formData.get('publicationDate') as string | null
    const language = formData.get('language') as string | null
    const tags = formData.get('tags') as string | null
    const mediaType = formData.get('mediaType') as string | null
    const mediaId = formData.get('mediaId') as string | null // Optional: add to existing media

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    // Validate media type
    const allowedMediaTypes = ['Book', 'Magazine', 'Paper', 'Article']
    const validatedMediaType = mediaType && allowedMediaTypes.includes(mediaType) ? mediaType : 'Book'

    // Validate file type
    const fileType = file.type
    if (fileType !== 'application/epub+zip' && fileType !== 'application/pdf') {
      return NextResponse.json({ error: 'Only EPUB and PDF files are allowed' }, { status: 400 })
    }

    const normalizedFileType = fileType === 'application/epub+zip' ? 'epub' : 'pdf'

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    })

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
      const existingFileType = existingMedia.files.find((f: { fileType: string }) => f.fileType === normalizedFileType)
      if (existingFileType) {
        return NextResponse.json({ error: `A ${normalizedFileType.toUpperCase()} file already exists for this media` }, { status: 400 })
      }

      // Add file to existing media
      await prisma.mediaFile.create({
        data: {
          mediaId: mediaId,
          fileUrl: blob.url,
          fileType: normalizedFileType
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
              fileUrl: blob.url,
              fileType: normalizedFileType
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
        const tagNames = tags.split(',').map(t => t.trim()).filter(t => t)
        
        if (tagNames.length > 0) {
          // Find or create all tags in batch
          const tagPromises = tagNames.map(async (tagName) => {
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
    console.error('Error uploading media:', error)
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const media = await prisma.media.findMany({
      where: {
        deletedAt: null // Only fetch non-deleted media
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
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}
