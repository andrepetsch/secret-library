'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ePub from 'epubjs'
import { useTheme } from '@/contexts/ThemeContext'

interface EpubRendition {
  prev: () => void
  next: () => void
  destroy: () => void
  display: (target?: string) => Promise<void>
  on: (event: string, callback: (location: EpubLocation) => void) => void
  themes: {
    default: (styles: Record<string, Record<string, string>>) => void
  }
}

interface EpubLocation {
  start: {
    cfi: string
    percentage: number
  }
}

interface EpubReaderProps {
  url: string
  mediaId: string
  fileId: string
}

export default function EpubReader({ url, mediaId, fileId }: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const renditionRef = useRef<EpubRendition | null>(null)
  const [percentComplete, setPercentComplete] = useState<number>(0)
  const { theme } = useTheme()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks current reading position so we can restore it on theme toggle
  const currentLocationRef = useRef<string | null>(null)

  const saveProgress = useCallback(
    (cfi: string, percent: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/media/${mediaId}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId,
              currentLocation: cfi,
              percentComplete: Math.round(percent * 100),
            }),
          })
        } catch (error) {
          console.error('Error saving reading progress:', error)
        }
      }, 1500)
    },
    [mediaId, fileId]
  )

  // Fetch saved progress and jump to it once the rendition is ready
  useEffect(() => {
    const fetchAndRestore = async () => {
      try {
        const response = await fetch(`/api/media/${mediaId}/progress`)
        if (response.ok) {
          const data = await response.json()
          const fileProgress = data.progress?.find(
            (p: { fileId: string; currentLocation: string | null; percentComplete: number }) =>
              p.fileId === fileId
          )
          if (fileProgress) {
            setPercentComplete(fileProgress.percentComplete)
            if (fileProgress.currentLocation && renditionRef.current) {
              currentLocationRef.current = fileProgress.currentLocation
              renditionRef.current.display(fileProgress.currentLocation)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching reading progress:', error)
      }
    }
    fetchAndRestore()
  }, [mediaId, fileId])

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

    // Resume from current position (handles theme toggle) or start from beginning.
    // fetchAndRestore (separate effect) sets currentLocationRef after the API call resolves,
    // then calls display() directly on renditionRef. This handles initial page restoration.
    // currentLocationRef is updated by the 'relocated' event during normal reading.
    if (currentLocationRef.current) {
      newRendition.display(currentLocationRef.current)
    } else {
      newRendition.display()
    }

    // Track location changes
    newRendition.on('relocated', (location: EpubLocation) => {
      const percent = location.start.percentage ?? 0
      currentLocationRef.current = location.start.cfi
      setPercentComplete(Math.round(percent * 100))
      saveProgress(location.start.cfi, percent)
    })

    renditionRef.current = newRendition

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
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      renditionRef.current = null
      newRendition.destroy()
    }
  // saveProgress is stable across re-renders when url/fileId don't change.
  // url and theme are the only values that should trigger a full re-render of the book.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, theme])

  const handlePrev = () => {
    if (renditionRef.current) renditionRef.current.prev()
  }

  const handleNext = () => {
    if (renditionRef.current) renditionRef.current.next()
  }

  return (
    <div className="relative w-full h-full bg-white dark:bg-gray-800 flex justify-center">
      <div className="w-full max-w-4xl h-full">
        <div ref={viewerRef} className="w-full h-[calc(100%-6rem)]" />
      </div>
      
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3 z-10">
        {percentComplete > 0 && (
          <div className="flex items-center gap-2 bg-gray-800/80 text-white px-4 py-1.5 rounded-full text-sm">
            <div className="w-24 bg-gray-600 rounded-full h-1.5">
              <div
                className="bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <span>{percentComplete}%</span>
          </div>
        )}
        <div className="flex gap-4">
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
    </div>
  )
}
