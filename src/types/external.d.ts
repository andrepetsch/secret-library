declare module 'jszip' {
  // Type definitions are provided by the package itself
}

declare module 'xml2js' {
  interface ParserOptions {
    explicitArray?: boolean
    [key: string]: unknown
  }

  function parseString(
    xml: string,
    options: ParserOptions,
    callback: (err: Error | null, result: unknown) => void
  ): void

  export { parseString, ParserOptions }
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
