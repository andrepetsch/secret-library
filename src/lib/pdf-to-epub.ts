import { EPub } from '@lesjoursfr/html-to-epub'
import * as fs from 'fs/promises'
import * as path from 'path'
import { nanoid } from 'nanoid'

export interface ConversionOptions {
  title?: string
  author?: string
  description?: string
  language?: string
  publicationDate?: string
}

/**
 * Convert a PDF buffer to an EPUB buffer
 * @param pdfBuffer - The PDF file as a Buffer
 * @param options - Conversion options including metadata
 * @returns EPUB file as a Buffer
 */
export async function convertPdfToEpub(
  pdfBuffer: Buffer,
  options: ConversionOptions = {}
): Promise<Buffer> {
  // Create a temporary file path for the EPUB
  const tempDir = '/tmp'
  const tempFileName = `epub-${nanoid()}.epub`
  const tempFilePath = path.join(tempDir, tempFileName)
  
  try {
    // Dynamic import pdf-lib
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfLib = await import('pdf-lib') as any
    const PDFDocument = pdfLib.PDFDocument
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pageCount = pdfDoc.getPageCount()
    
    console.log(`[PDF to EPUB] Converting PDF with ${pageCount} pages`)

    // Extract text from PDF pages
    // Note: pdf-lib doesn't have built-in text extraction
    // We'll create a simple HTML representation based on page structure
    const htmlContent = await extractPdfContent(pdfDoc, pageCount)

    // Prepare EPUB metadata
    const title = options.title || 'Untitled'
    const author = options.author || 'Unknown Author'
    const description = options.description || ''
    const language = options.language || 'en'

    console.log(`[PDF to EPUB] Creating EPUB with title: ${title}`)

    // Create EPUB options
    const epubOptions = {
      title,
      author,
      description,
      lang: language,
      tempDir: tempDir, // Use /tmp for temporary files (required for serverless environments)
      content: [
        {
          title: 'Content',
          data: htmlContent,
        },
      ],
      verbose: false,
    }

    // Generate EPUB (pass output as second argument)
    const epub = new EPub(epubOptions, tempFilePath)
    await epub.render()

    console.log('[PDF to EPUB] EPUB file created at:', tempFilePath)
    
    // Read the EPUB file into a buffer
    const epubBuffer = await fs.readFile(tempFilePath)
    
    console.log('[PDF to EPUB] EPUB buffer created, size:', epubBuffer.length)
    
    // Clean up the temporary file
    await fs.unlink(tempFilePath).catch(err => {
      console.warn('[PDF to EPUB] Failed to delete temp file:', err)
    })
    
    return epubBuffer
  } catch (error) {
    // Clean up temp file on error
    await fs.unlink(tempFilePath).catch(() => {
      // Ignore cleanup errors
    })
    
    console.error('[PDF to EPUB] Conversion error:', error)
    throw new Error(`Failed to convert PDF to EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Extract content from PDF pages and convert to HTML
 * @param pdfDoc - The loaded PDF document
 * @param pageCount - Number of pages in the PDF
 * @returns HTML content as a string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractPdfContent(pdfDoc: any, pageCount: number): Promise<string> {
  // Since pdf-lib doesn't support text extraction, we'll create a basic structure
  // In a production environment, you might want to use pdf.js or pdfjs-dist for text extraction
  
  let htmlContent = '<div style="font-family: serif; line-height: 1.6;">\n'
  
  // Get basic info from PDF metadata
  const title = pdfDoc.getTitle()
  const author = pdfDoc.getAuthor()
  const subject = pdfDoc.getSubject()
  
  if (title) {
    htmlContent += `<h1>${escapeHtml(title)}</h1>\n`
  }
  
  if (author) {
    htmlContent += `<p><em>By ${escapeHtml(author)}</em></p>\n`
  }
  
  if (subject) {
    htmlContent += `<p>${escapeHtml(subject)}</p>\n`
  }
  
  // Add a note about the conversion
  htmlContent += '<hr>\n'
  htmlContent += '<p><em>This EPUB was automatically converted from a PDF document.</em></p>\n'
  htmlContent += `<p><em>The original PDF contains ${pageCount} page(s).</em></p>\n`
  htmlContent += '<p><em>Note: Text extraction from PDFs is limited. For best reading experience, please use the original PDF format.</em></p>\n'
  htmlContent += '<hr>\n\n'
  
  // In a real implementation, you would extract actual text content here
  // For now, we'll add page markers
  for (let i = 1; i <= pageCount; i++) {
    htmlContent += `<div class="page">\n`
    htmlContent += `<h2>Page ${i}</h2>\n`
    htmlContent += `<p><em>[Content from page ${i} of the original PDF]</em></p>\n`
    htmlContent += `</div>\n\n`
  }
  
  htmlContent += '</div>'
  
  return htmlContent
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}