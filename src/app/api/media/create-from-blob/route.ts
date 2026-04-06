import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { s3, getS3Bucket } from '@/lib/s3'
import { HeadObjectCommand } from '@aws-sdk/client-s3'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      s3Key,
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

    if (!s3Key) {
      return NextResponse.json({ error: 's3Key is required' }, { status: 400 })
    }

    // Verify the file actually exists in S3
    try {
      await s3().send(new HeadObjectCommand({ Bucket: getS3Bucket(), Key: s3Key }))
    } catch {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 400 })
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

      // Check if this exact s3Key already exists (prevent duplicates)
      const existingKeyFile = existingMedia.files.find((f: { fileUrl: string }) => f.fileUrl === s3Key)
      if (existingKeyFile) {
        media = existingMedia
      } else {
        // Add file to existing media
        await prisma.mediaFile.create({
          data: {
            mediaId: mediaId,
            fileUrl: s3Key,
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
      }
    } else {
      // Create new media record with file
      if (!title) {
        return NextResponse.json({ error: 'Title is required for new media' }, { status: 400 })
      }

      // Check if a media file with this s3Key already exists (prevent duplicates)
      const existingFile = await prisma.mediaFile.findFirst({
        where: { fileUrl: s3Key },
        include: {
          media: {
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
          }
        }
      })
      
      if (existingFile) {
        return NextResponse.json({ media: existingFile.media })
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
              fileUrl: s3Key,
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
          const tagPromises = tagNames.map(async (tagName: string) => {
            return prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName }
            })
          })
          
          const createdTags = await Promise.all(tagPromises)
          
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
    console.error('Error creating media from S3:', error)
    return NextResponse.json({ error: 'Failed to create media record' }, { status: 500 })
  }
}
