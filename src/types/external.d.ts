declare module 'epub-metadata' {
  interface EpubMetadata {
    title?: string
    creator?: string | string[]
    description?: string
    language?: string
    date?: string
    published?: string
    [key: string]: any
  }

  function parseMetadata(
    buffer: Buffer,
    callback: (error: Error | null, data: EpubMetadata) => void
  ): void

  export = parseMetadata
}

declare module 'pdf-parse' {
  interface PdfInfo {
    Title?: string
    Author?: string
    Subject?: string
    CreationDate?: string
    [key: string]: any
  }

  interface PdfData {
    info: PdfInfo
    text: string
    numpages: number
    [key: string]: any
  }

  function pdfParse(buffer: Buffer): Promise<PdfData>

  export = pdfParse
}
