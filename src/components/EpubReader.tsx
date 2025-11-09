'use client'

import { useEffect, useRef, useState } from 'react'
import ePub from 'epubjs'
import { useTheme } from '@/contexts/ThemeContext'

interface EpubRendition {
  prev: () => void
  next: () => void
  destroy: () => void
  themes: {
    default: (styles: Record<string, Record<string, string>>) => void
  }
}

export default function EpubReader({ url }: { url: string }) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [rendition, setRendition] = useState<EpubRendition | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    if (!viewerRef.current || !url) return

    const book = ePub(url)
    const newRendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
    })

    // Apply theme-based styling to the epub content
    const applyTheme = () => {
      if (theme === 'dark') {
        newRendition.themes.default({
          'body': {
            'background-color': '#1f2937 !important',
            'color': '#e5e7eb !important'
          },
          'p': {
            'color': '#e5e7eb !important'
          },
          'h1, h2, h3, h4, h5, h6': {
            'color': '#f3f4f6 !important'
          },
          'a': {
            'color': '#60a5fa !important'
          }
        })
      } else {
        newRendition.themes.default({
          'body': {
            'background-color': '#ffffff !important',
            'color': '#1f2937 !important'
          },
          'p': {
            'color': '#1f2937 !important'
          },
          'h1, h2, h3, h4, h5, h6': {
            'color': '#111827 !important'
          },
          'a': {
            'color': '#2563eb !important'
          }
        })
      }
    }

    applyTheme()
    newRendition.display()
    setRendition(newRendition)

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        newRendition.next()
      } else if (e.key === 'ArrowLeft') {
        newRendition.prev()
      }
    }

    document.addEventListener('keydown', handleKeyPress)

    return () => {
      document.removeEventListener('keydown', handleKeyPress)
      newRendition.destroy()
    }
  }, [url, theme])

  const handlePrev = () => {
    if (rendition) rendition.prev()
  }

  const handleNext = () => {
    if (rendition) rendition.next()
  }

  return (
    <div className="relative w-full h-full bg-white dark:bg-gray-800 flex justify-center">
      <div className="w-full max-w-4xl h-full">
        <div ref={viewerRef} className="w-full h-[calc(100%-6rem)]" />
      </div>
      
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
        <button
          onClick={handlePrev}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-lg"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-lg"
        >
          Next
        </button>
      </div>
    </div>
  )
}
