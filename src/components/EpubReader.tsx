'use client'

import { useEffect, useRef, useState } from 'react'
import ePub from 'epubjs'

export default function EpubReader({ url }: { url: string }) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [rendition, setRendition] = useState<{ prev: () => void; next: () => void; destroy: () => void } | null>(null)

  useEffect(() => {
    if (!viewerRef.current || !url) return

    const book = ePub(url)
    const newRendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
    })

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
  }, [url])

  const handlePrev = () => {
    if (rendition) rendition.prev()
  }

  const handleNext = () => {
    if (rendition) rendition.next()
  }

  return (
    <div className="relative w-full h-full bg-white">
      <div ref={viewerRef} className="w-full h-full" />
      
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          onClick={handlePrev}
          className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 shadow-lg"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 shadow-lg"
        >
          Next
        </button>
      </div>
    </div>
  )
}
