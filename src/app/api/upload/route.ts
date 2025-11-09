import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleUpload } from '@vercel/blob/client'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validate user is authenticated
        if (!session?.user?.id) {
          throw new Error('Unauthorized')
        }

        // Parse client payload if provided
        let metadata = null
        if (clientPayload) {
          try {
            metadata = JSON.parse(clientPayload)
          } catch {
            // Invalid JSON, ignore
          }
        }

        return {
          allowedContentTypes: ['application/pdf', 'application/epub+zip'],
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024, // 5 GB limit (Vercel Blob supports up to 5TB but let's be reasonable)
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            metadata: metadata || {}
          })
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Parse the token payload to get user ID and metadata
        const payload = tokenPayload ? JSON.parse(tokenPayload) : {}
        const userId = payload.userId
        const metadata = payload.metadata || {}

        if (!userId) {
          console.error('No user ID in token payload')
          return
        }

        // Determine file type from content type or URL
        const fileType = blob.contentType === 'application/epub+zip' ? 'epub' : 'pdf'

        // Check if this is adding to existing media or creating new media
        if (metadata.mediaId) {
          // Adding to existing media
          const existingMedia = await prisma.media.findUnique({
            where: { id: metadata.mediaId },
            include: { files: true }
          })

          if (!existingMedia) {
            console.error('Media not found:', metadata.mediaId)
            return
          }

          if (existingMedia.uploadedBy !== userId) {
            console.error('User does not own this media')
            return
          }

          // Check if file type already exists
          const existingFileType = existingMedia.files.find(f => f.fileType === fileType)
          if (existingFileType) {
            console.error(`A ${fileType.toUpperCase()} file already exists for this media`)
            return
          }

          // Add file to existing media
          await prisma.mediaFile.create({
            data: {
              mediaId: metadata.mediaId,
              fileUrl: blob.url,
              fileType: fileType
            }
          })
        } else {
          // Create new media with file
          const validatedMediaType = ['Book', 'Magazine', 'Paper', 'Article'].includes(metadata.mediaType) 
            ? metadata.mediaType 
            : 'Book'

          const media = await prisma.media.create({
            data: {
              title: metadata.title || 'Untitled',
              author: metadata.author || null,
              description: metadata.description || null,
              publicationDate: metadata.publicationDate || null,
              language: metadata.language || null,
              mediaType: validatedMediaType,
              uploadedBy: userId,
              files: {
                create: {
                  fileUrl: blob.url,
                  fileType: fileType
                }
              }
            }
          })

          // Handle tags if provided
          if (metadata.tags) {
            const tagNames = metadata.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
            
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
            }
          }
        }
      }
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('Error in upload handler:', error)
    return NextResponse.json({ error: 'Failed to handle upload' }, { status: 500 })
  }
}
