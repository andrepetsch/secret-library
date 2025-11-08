declare module 'epub-metadata' {
  interface EpubMetadata {
    title?: string
    creator?: string | string[]
    description?: string
    language?: string
    date?: string
    published?: string
    [key: string]: unknown
  }

  function parseMetadata(filePath: string): Promise<EpubMetadata>

  export = parseMetadata
}

declare module 'pdf-parse' {
  interface PdfInfo {
    Title?: string
    Author?: string
    Subject?: string
    CreationDate?: string
    [key: string]: unknown
  }

  interface PdfData {
    info: PdfInfo
    text: string
    numpages: number
    [key: string]: unknown
  }

  function pdfParse(buffer: Buffer): Promise<PdfData>

  export = pdfParse
}
