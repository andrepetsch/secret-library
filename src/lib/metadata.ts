import EPub from 'epub-metadata'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'

export interface MediaMetadata {
  title?: string
  author?: string
  description?: string
  language?: string
  publicationDate?: string
}

/**
 * Extract metadata from an EPUB file
 * @param fileBuffer - The EPUB file as a Buffer
 * @returns Extracted metadata
 */
export async function extractEpubMetadata(fileBuffer: Buffer): Promise<MediaMetadata> {
  // epub-metadata expects a file path, so we need to write to a temp file
  const tempFilePath = join(tmpdir(), `epub-${randomBytes(16).toString('hex')}.epub`)
  
  try {
    // Write buffer to temporary file
    await writeFile(tempFilePath, fileBuffer)
    
    // Extract metadata using the library
    return new Promise((resolve, reject) => {
      EPub(tempFilePath)
        .then((data: Record<string, unknown>) => {
          const metadata: MediaMetadata = {}

          // Extract title
          if (data.title && typeof data.title === 'string') {
            metadata.title = data.title
          }

          // Extract author (can be string or array)
          if (data.creator) {
            if (Array.isArray(data.creator)) {
              metadata.author = data.creator.join(', ')
            } else if (typeof data.creator === 'string') {
              metadata.author = data.creator
            }
          }

          // Extract description
          if (data.description && typeof data.description === 'string') {
            metadata.description = data.description
          }

          // Extract language
          if (data.language && typeof data.language === 'string') {
            metadata.language = data.language
          }

          // Extract publication date
          if (data.date && typeof data.date === 'string') {
            metadata.publicationDate = data.date
          } else if (data.published && typeof data.published === 'string') {
            metadata.publicationDate = data.published
          }

          resolve(metadata)
        })
        .catch((error: Error) => {
          console.error('Error parsing EPUB metadata:', error)
          reject(error)
        })
    })
  } finally {
    // Clean up temporary file
    try {
      await unlink(tempFilePath)
    } catch (error) {
      // Ignore errors when deleting temp file
      console.error('Error deleting temp file:', error)
    }
  }
}

/**
 * Extract metadata from a PDF file
 * @param fileBuffer - The PDF file as a Buffer
 * @returns Extracted metadata
 */
export async function extractPdfMetadata(fileBuffer: Buffer): Promise<MediaMetadata> {
  try {
    // Dynamic import to avoid build-time issues with pdf-parse
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(fileBuffer)
    const metadata: MediaMetadata = {}

    // Extract metadata from PDF info
    if (data.info) {
      // Title
      if (data.info.Title) {
        metadata.title = data.info.Title
      }

      // Author
      if (data.info.Author) {
        metadata.author = data.info.Author
      }

      // Subject (use as description)
      if (data.info.Subject) {
        metadata.description = data.info.Subject
      }

      // Creation date
      if (data.info.CreationDate) {
        // PDF dates are in format "D:YYYYMMDDHHmmSS"
        const dateStr = data.info.CreationDate.toString()
        const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})/)
        if (match) {
          const year = match[1]
          const month = match[2]
          const day = match[3]
          metadata.publicationDate = `${year}-${month}-${day}`
        }
      }
    }

    return metadata
  } catch (error) {
    console.error('Error parsing PDF metadata:', error)
    throw error
  }
}

/**
 * Extract metadata from a file based on its type
 * @param file - The file to extract metadata from
 * @param fileType - The type of the file ('epub' or 'pdf')
 * @returns Extracted metadata
 */
export async function extractMetadata(file: File, fileType: string): Promise<MediaMetadata> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (fileType === 'epub') {
    return extractEpubMetadata(buffer)
  } else if (fileType === 'pdf') {
    return extractPdfMetadata(buffer)
  }

  return {}
}
