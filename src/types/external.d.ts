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

declare module 'pdf-lib' {
  // Type definitions are provided by the package itself
}
