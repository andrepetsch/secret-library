import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFileToS3, validateFileSize, validateFileType } from '@/lib/s3-upload'
import { ALLOWED_CONTENT_TYPES } from '@/lib/s3'

export async function POST(req: NextRequest) {
  try {
    console.log('[Upload API] POST request received')
    
    const session = await auth()
    
    if (!session?.user?.id) {
      console.log('[Upload API] Unauthorized - no session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Upload API] User authenticated:', session.user.id)

    // Parse form data for file uploads (server-side upload)
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      console.error('[Upload API] No file provided in form data')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[Upload API] File received:', file.name, 'Size:', file.size, 'Type:', file.type)

    // Validate file size (strict 50MB limit)
    if (!validateFileSize(file)) {
      console.error('[Upload API] File size exceeds 50MB limit')
      return NextResponse.json(
        { error: `File size exceeds the maximum limit of 50MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!validateFileType(file)) {
      console.error('[Upload API] File type not allowed:', file.type)
      return NextResponse.json(
        { error: `Only PDF and EPUB files are allowed` },
        { status: 400 }
      )
    }

    // Extract metadata from form data
    const metadata: Record<string, string> = {
      userId: session.user.id,
    }

    if (formData.has('title')) metadata.title = formData.get('title') as string
    if (formData.has('author')) metadata.author = formData.get('author') as string
    if (formData.has('description')) metadata.description = formData.get('description') as string
    if (formData.has('mediaType')) metadata.mediaType = formData.get('mediaType') as string
    if (formData.has('mediaId')) metadata.mediaId = formData.get('mediaId') as string
    if (formData.has('language')) metadata.language = formData.get('language') as string
    if (formData.has('publicationDate')) metadata.publicationDate = formData.get('publicationDate') as string
    if (formData.has('tags')) metadata.tags = formData.get('tags') as string

    console.log('[Upload API] Metadata extracted:', Object.keys(metadata))

    // Upload file to S3 storage
    let s3Result
    try {
      s3Result = await uploadFileToS3(file, metadata)
      console.log('[Upload API] File uploaded to S3:', s3Result.url)
    } catch (uploadError) {
      console.error('[Upload API] S3 upload failed:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Determine file type from content type
    const fileType = file.type === 'application/epub+zip' ? 'epub' : 'pdf'
    const fileUrl = s3Result.url

    // Check if adding to existing media or creating new media
    if (metadata.mediaId) {
      console.log('[Upload API] Adding file to existing media:', metadata.mediaId)
      
      // Adding to existing media
      const existingMedia = await prisma.media.findUnique({
        where: { id: metadata.mediaId },
        include: { files: true }
      })

      if (!existingMedia) {
        console.error('[Upload API] Media not found:', metadata.mediaId)
        return NextResponse.json({ error: 'Media not found' }, { status: 404 })
      }

      if (existingMedia.uploadedBy !== session.user.id) {
        console.error('[Upload API] User does not own this media')
        return NextResponse.json({ error: 'Forbidden: You can only add files to your own media' }, { status: 403 })
      }

      // Check if file type already exists
      const existingFileType = existingMedia.files.find((f: { fileType: string }) => f.fileType === fileType)
      if (existingFileType) {
        console.error(`[Upload API] A ${fileType.toUpperCase()} file already exists for this media`)
        return NextResponse.json(
          { error: `A ${fileType.toUpperCase()} file already exists for this media` },
          { status: 400 }
        )
      }

      // Check if this exact file URL already exists (prevent duplicates)
      const existingBlobFile = existingMedia.files.find((f: { fileUrl: string }) => f.fileUrl === fileUrl)
      if (existingBlobFile) {
        console.log('[Upload API] File already exists in media, returning existing media')
        const updatedMedia = await prisma.media.findUnique({
          where: { id: metadata.mediaId },
          include: { files: true, tags: true }
        })
        return NextResponse.json({ media: updatedMedia })
      }

      // Add file to existing media
      await prisma.mediaFile.create({
        data: {
          mediaId: metadata.mediaId,
          fileUrl: fileUrl,
          fileType: fileType
        }
      })

      console.log('[Upload API] File successfully added to existing media')
      const updatedMedia = await prisma.media.findUnique({
        where: { id: metadata.mediaId },
        include: { files: true, tags: true, user: { select: { name: true, email: true } } }
      })

      return NextResponse.json({ media: updatedMedia })
    } else {
      console.log('[Upload API] Creating new media with file')
      
      // Check if a media file with this URL already exists (prevent duplicates)
      const existingFile = await prisma.mediaFile.findFirst({
        where: { fileUrl: fileUrl }
      })
      
      if (existingFile) {
        console.log('[Upload API] Media file already exists, returning existing media')
        const existingMedia = await prisma.media.findUnique({
          where: { id: existingFile.mediaId },
          include: { files: true, tags: true, user: { select: { name: true, email: true } } }
        })
        return NextResponse.json({ media: existingMedia })
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
          uploadedBy: session.user.id,
          files: {
            create: {
              fileUrl: fileUrl,
              fileType: fileType
            }
          }
        }
      })

      console.log('[Upload API] Media created with ID:', media.id)

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

          console.log('[Upload API] Tags added to media:', tagNames)
        }
      }

      // Return the created media with full relations
      const createdMedia = await prisma.media.findUnique({
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

      console.log('[Upload API] Upload completed successfully')
      return NextResponse.json({ media: createdMedia })
    }
  } catch (error) {
    console.error('Error in upload handler:', error)
    return NextResponse.json(
      { error: 'Failed to handle upload', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Handle GET requests

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to upload files.' },
    { status: 405 }
  )
}
