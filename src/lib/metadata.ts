import { parseString } from 'xml2js'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export interface MediaMetadata {
  title?: string
  author?: string
  description?: string
  language?: string
  publicationDate?: string
  tags?: string
}

/**
 * Helper function to extract text from various metadata value formats
 * @param value - The metadata value (can be string, object, or array)
 * @returns Extracted string value or undefined
 */
function extractTextValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    // If it's an array, take the first element
    return extractTextValue(value[0])
  }
  if (value && typeof value === 'object') {
    // Check for _ property which contains text content in xml2js
    const objValue = value as Record<string, unknown>
    if (objValue._) {
      return String(objValue._)
    }
    // Try to find any string property
    for (const key in objValue) {
      if (typeof objValue[key] === 'string') {
        return objValue[key] as string
      }
    }
  }
  return undefined
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
              const title = extractTextValue(opfMetadata['dc:title'])
              if (title) metadata.title = title
            }
            
            // Extract author/creator (dc:creator)
            if (opfMetadata['dc:creator']) {
              const creator = opfMetadata['dc:creator']
              if (Array.isArray(creator)) {
                const authors = creator
                  .map(c => extractTextValue(c))
                  .filter(a => a !== undefined)
                metadata.author = authors.join(', ')
              } else {
                const author = extractTextValue(creator)
                if (author) metadata.author = author
              }
            }
            
            // Extract description (dc:description)
            if (opfMetadata['dc:description']) {
              const description = extractTextValue(opfMetadata['dc:description'])
              if (description) metadata.description = description
            }
            
            // Extract language (dc:language)
            if (opfMetadata['dc:language']) {
              const language = extractTextValue(opfMetadata['dc:language'])
              if (language) metadata.language = language
            }
            
            // Extract publication date (dc:date)
            if (opfMetadata['dc:date']) {
              const date = extractTextValue(opfMetadata['dc:date'])
              if (date) metadata.publicationDate = date
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
    // Dynamic import pdf-lib
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfLib = await import('pdf-lib') as any
    const PDFDocument = pdfLib.PDFDocument
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(fileBuffer)
    const metadata: MediaMetadata = {}

    // Extract metadata from PDF info
    const title = pdfDoc.getTitle()
    const author = pdfDoc.getAuthor()
    const subject = pdfDoc.getSubject()
    const creationDate = pdfDoc.getCreationDate()

    // Title
    if (title) {
      metadata.title = title
    }

    // Author
    if (author) {
      metadata.author = author
    }

    // Subject (use as description)
    if (subject) {
      metadata.description = subject
    }

    // Creation date
    if (creationDate) {
      // PDF creation dates are Date objects
      const year = creationDate.getFullYear()
      const month = String(creationDate.getMonth() + 1).padStart(2, '0')
      const day = String(creationDate.getDate()).padStart(2, '0')
      metadata.publicationDate = `${year}-${month}-${day}`
    }

    return metadata
  } catch (error) {
    console.error('Error parsing PDF metadata:', error)
    return {}
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

/**
 * Generate tags from title and description using OpenAI
 * @param title - The title of the media
 * @param description - The description of the media
 * @returns Comma-separated tags or undefined if generation fails
 */
export async function generateTags(title?: string, description?: string): Promise<string | undefined> {
  try {
    // Only generate tags if we have at least a title or description
    if (!title && !description) {
      console.log('[Generate Tags] No title or description provided, skipping tag generation')
      return undefined
    }

    // Check if API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log('[Generate Tags] OPENAI_API_KEY not configured, skipping tag generation')
      return undefined
    }

    // Build the prompt
    let prompt = 'Generate relevant tags for the following content:\n\n'
    if (title) {
      prompt += `Title: ${title}\n`
    }
    if (description) {
      prompt += `Description: ${description}\n`
    }
    prompt += '\nReturn only comma-separated tags (e.g., "python, api, development"). Be concise and relevant.'

    console.log('[Generate Tags] Generating tags for:', { title, description })

    // Create OpenAI provider with API key
    const openaiProvider = createOpenAI({
      apiKey: apiKey
    })

    // Call OpenAI API using responses API as requested in the issue
    // Limited to 50 tokens as specified in the requirements
    const { text } = await generateText({
      model: openaiProvider.responses('gpt-4o-mini'),
      prompt: prompt,
      maxOutputTokens: 50
    })

    const tags = text.trim()
    console.log('[Generate Tags] Generated tags:', tags)

    return tags || undefined
  } catch (error) {
    console.error('[Generate Tags] Error generating tags:', error)
    return undefined
  }
}
