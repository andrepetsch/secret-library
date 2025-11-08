import { parseString } from 'xml2js'

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
  try {
    // Dynamic import to handle JSZip's CommonJS export
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JSZipModule = await import('jszip') as any
    const zip = new JSZipModule.default()
    const epub = await zip.loadAsync(fileBuffer)
    
    // Find the content.opf file (metadata file)
    let contentOpfPath: string | null = null
    const possiblePaths = ['content.opf', 'OEBPS/content.opf', 'EPUB/content.opf']
    
    for (const path of possiblePaths) {
      if (epub.files[path]) {
        contentOpfPath = path
        break
      }
    }
    
    // If not found in common locations, search all files
    if (!contentOpfPath) {
      for (const filename in epub.files) {
        if (filename.endsWith('.opf')) {
          contentOpfPath = filename
          break
        }
      }
    }
    
    if (!contentOpfPath) {
      console.warn('Could not find .opf metadata file in EPUB')
      return {}
    }
    
    // Read the content.opf file
    const contentOpfFile = epub.files[contentOpfPath]
    const contentOpfXml = await contentOpfFile.async('text')
    
    // Parse the XML
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseString(contentOpfXml, { explicitArray: false }, (err, result: any) => {
        if (err) {
          console.error('Error parsing EPUB metadata XML:', err)
          reject(err)
          return
        }
        
        const metadata: MediaMetadata = {}
        
        try {
          const opfMetadata = result?.package?.metadata
          
          if (opfMetadata) {
            // Extract title (dc:title)
            if (opfMetadata['dc:title']) {
              const title = opfMetadata['dc:title']
              metadata.title = typeof title === 'string' ? title : title?._ || title
            }
            
            // Extract author/creator (dc:creator)
            if (opfMetadata['dc:creator']) {
              const creator = opfMetadata['dc:creator']
              if (Array.isArray(creator)) {
                metadata.author = creator.map(c => typeof c === 'string' ? c : c?._ || c).join(', ')
              } else {
                metadata.author = typeof creator === 'string' ? creator : creator?._ || creator
              }
            }
            
            // Extract description (dc:description)
            if (opfMetadata['dc:description']) {
              const description = opfMetadata['dc:description']
              metadata.description = typeof description === 'string' ? description : description?._ || description
            }
            
            // Extract language (dc:language)
            if (opfMetadata['dc:language']) {
              const language = opfMetadata['dc:language']
              metadata.language = typeof language === 'string' ? language : language?._ || language
            }
            
            // Extract publication date (dc:date)
            if (opfMetadata['dc:date']) {
              const date = opfMetadata['dc:date']
              metadata.publicationDate = typeof date === 'string' ? date : date?._ || date
            }
          }
          
          resolve(metadata)
        } catch (error) {
          console.error('Error extracting EPUB metadata:', error)
          resolve({}) // Return empty metadata instead of failing
        }
      })
    })
  } catch (error) {
    console.error('Error reading EPUB file:', error)
    return {}
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
