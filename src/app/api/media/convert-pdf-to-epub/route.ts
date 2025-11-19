import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { convertPdfToEpub } from '@/lib/pdf-to-epub'

/**
 * POST /api/media/convert-pdf-to-epub
 * Convert existing PDF media files to EPUB format
 * 
 * Request body:
 * - mediaId (optional): Convert a specific media item's PDF to EPUB
 * - all (optional boolean): Convert all PDF files that don't have EPUBs yet
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { mediaId, all } = body

    // Validate input
    if (!mediaId && !all) {
      return NextResponse.json(
        { error: 'Either mediaId or all parameter is required' },
        { status: 400 }
      )
    }

    const results: Array<{ mediaId: string; success: boolean; error?: string }> = []

    if (mediaId) {
      // Convert a specific media item
      console.log('[Convert PDF to EPUB] Converting single media:', mediaId)
      const result = await convertMediaPdfToEpub(mediaId)
      results.push(result)
    } else if (all) {
      // Convert all PDFs that don't have EPUBs yet
      console.log('[Convert PDF to EPUB] Converting all PDFs without EPUBs')
      
      // Find all media items that have PDF files but no EPUB files
      const mediaWithPdfs = await prisma.media.findMany({
        where: {
          deletedAt: null,
          files: {
            some: {
              fileType: 'pdf'
            }
          }
        },
        include: {
          files: true
        }
      })

      console.log(`[Convert PDF to EPUB] Found ${mediaWithPdfs.length} media items with PDFs`)

      // Filter to only those without EPUBs
      const mediaNeedingConversion = mediaWithPdfs.filter(media => 
        !media.files.some(file => file.fileType === 'epub')
      )

      console.log(`[Convert PDF to EPUB] ${mediaNeedingConversion.length} need EPUB conversion`)

      // Convert each one
      for (const media of mediaNeedingConversion) {
        const result = await convertMediaPdfToEpub(media.id)
        results.push(result)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Conversion complete: ${successCount} succeeded, ${failureCount} failed`,
      results
    })
  } catch (error) {
    console.error('[Convert PDF to EPUB] Error:', error)
    return NextResponse.json(
      { error: 'Failed to convert PDFs to EPUB' },
      { status: 500 }
    )
  }
}

/**
 * Convert a single media item's PDF to EPUB
 */
async function convertMediaPdfToEpub(
  mediaId: string
): Promise<{ mediaId: string; success: boolean; error?: string }> {
  try {
    // Find the media item
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: { files: true }
    })

    if (!media) {
      return {
        mediaId,
        success: false,
        error: 'Media not found'
      }
    }

    if (media.deletedAt) {
      return {
        mediaId,
        success: false,
        error: 'Media is deleted'
      }
    }

    // Find PDF file
    const pdfFile = media.files.find(f => f.fileType === 'pdf')
    if (!pdfFile) {
      return {
        mediaId,
        success: false,
        error: 'No PDF file found for this media'
      }
    }

    // Check if EPUB already exists
    const epubFile = media.files.find(f => f.fileType === 'epub')
    if (epubFile) {
      return {
        mediaId,
        success: false,
        error: 'EPUB file already exists for this media'
      }
    }

    console.log(`[Convert PDF to EPUB] Converting media ${mediaId}: ${media.title}`)

    // Fetch the PDF file
    const pdfResponse = await fetch(pdfFile.fileUrl)
    if (!pdfResponse.ok) {
      return {
        mediaId,
        success: false,
        error: `Failed to fetch PDF: ${pdfResponse.statusText}`
      }
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())
    
    // Convert PDF to EPUB
    const epubBuffer = await convertPdfToEpub(pdfBuffer, {
      title: media.title,
      author: media.author || undefined,
      description: media.description || undefined,
      language: media.language || undefined,
      publicationDate: media.publicationDate || undefined
    })
    
    // Upload EPUB to blob storage
    const epubFilename = `${mediaId}-converted.epub`
    const epubBlob = await put(epubFilename, epubBuffer, {
      access: 'public',
      contentType: 'application/epub+zip'
    })
    
    // Add EPUB file to media
    await prisma.mediaFile.create({
      data: {
        mediaId: mediaId,
        fileUrl: epubBlob.downloadUrl,
        fileType: 'epub'
      }
    })
    
    console.log(`[Convert PDF to EPUB] Successfully converted media ${mediaId}`)
    
    return {
      mediaId,
      success: true
    }
  } catch (error) {
    console.error(`[Convert PDF to EPUB] Error converting media ${mediaId}:`, error)
    return {
      mediaId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
