import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { handleUpload } from '@vercel/blob/client'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    console.log('[Upload API] POST request received')
    
    const session = await auth()
    
    if (!session?.user?.id) {
      console.log('[Upload API] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Upload API] User authenticated:', session.user.id)

    const body = await req.json()
    console.log('[Upload API] Request body type:', body.type || 'unknown')

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        console.log('[Upload] onBeforeGenerateToken called for:', pathname)
        // Validate user is authenticated
        if (!session?.user?.id) {
          throw new Error('Unauthorized')
        }

        // Parse client payload if provided
        let metadata = null
        if (clientPayload) {
          try {
            metadata = JSON.parse(clientPayload)
            console.log('[Upload] Parsed client payload:', metadata)
          } catch (error) {
            console.error('[Upload] Failed to parse client payload:', error)
            // Invalid JSON, ignore
          }
        }

        const tokenPayload = {
          userId: session.user.id,
          metadata: metadata || {}
        }
        
        console.log('[Upload] Token payload prepared:', tokenPayload)

        return {
          allowedContentTypes: ['application/pdf', 'application/epub+zip'],
          maximumSizeInBytes: 5 * 1024 * 1024 * 1024, // 5 GB limit (Vercel Blob supports up to 5TB but let's be reasonable)
          tokenPayload: JSON.stringify(tokenPayload)
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          console.log('[Upload] onUploadCompleted called for:', blob.url)
          console.log('[Upload] Download URL:', blob.downloadUrl)
          
          // Parse the token payload to get user ID and metadata
          const payload = tokenPayload ? JSON.parse(tokenPayload) : {}
          const userId = payload.userId
          const metadata = payload.metadata || {}

          console.log('[Upload] Parsed payload:', { userId, metadata })

          if (!userId) {
            console.error('[Upload] No user ID in token payload')
            return
          }

          // Determine file type from content type or URL
          const fileType = blob.contentType === 'application/epub+zip' ? 'epub' : 'pdf'

          console.log('[Upload] File type determined:', fileType)

          // Use downloadUrl instead of url for proper CORS and content-type headers
          const fileUrl = blob.downloadUrl

          // Check if this is adding to existing media or creating new media
          if (metadata.mediaId) {
            console.log('[Upload] Adding file to existing media:', metadata.mediaId)
            
            // Adding to existing media
            const existingMedia = await prisma.media.findUnique({
              where: { id: metadata.mediaId },
              include: { files: true }
            })

            if (!existingMedia) {
              console.error('[Upload] Media not found:', metadata.mediaId)
              return
            }

            if (existingMedia.uploadedBy !== userId) {
              console.error('[Upload] User does not own this media')
              return
            }

            // Check if file type already exists
            const existingFileType = existingMedia.files.find(f => f.fileType === fileType)
            if (existingFileType) {
              console.error(`[Upload] A ${fileType.toUpperCase()} file already exists for this media`)
              return
            }

            // Add file to existing media
            await prisma.mediaFile.create({
              data: {
                mediaId: metadata.mediaId,
                fileUrl: fileUrl,
                fileType: fileType
              }
            })

            console.log('[Upload] File successfully added to existing media')
          } else {
            console.log('[Upload] Creating new media with file')
            
            // Check if a media file with this blob URL already exists
            // This prevents duplicates if both webhook and explicit API call execute
            const existingFile = await prisma.mediaFile.findFirst({
              where: { fileUrl: fileUrl }
            })
            
            if (existingFile) {
              console.log('[Upload] Media file already exists for this blob URL, skipping creation')
              return
            }
            
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
                    fileUrl: fileUrl,
                    fileType: fileType
                  }
                }
              }
            })

            console.log('[Upload] Media created with ID:', media.id)

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

                console.log('[Upload] Tags added to media:', tagNames)
              }
            }

            console.log('[Upload] Upload completed successfully')
          }
        } catch (error) {
          console.error('[Upload] Error in onUploadCompleted:', error)
          // Note: We can't return an error response here as this is a callback
          // The error will be logged but the upload has already succeeded
        }
      }
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('Error in upload handler:', error)
    return NextResponse.json({ error: 'Failed to handle upload' }, { status: 500 })
  }
}
