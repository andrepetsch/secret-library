'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfReaderProps {
  url: string
  mediaId: string
  fileId: string
}

export default function PdfReader({ url, mediaId, fileId }: PdfReaderProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pageWidth, setPageWidth] = useState<number>(800)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRestoredRef = useRef(false)

  useEffect(() => {
    // Set page width based on window size
    const updateWidth = () => {
      setPageWidth(Math.min(window.innerWidth - 100, 800))
    }
    
    updateWidth()
    window.addEventListener('resize', updateWidth)
    
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Fetch saved progress on mount
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/media/${mediaId}/progress`)
        if (response.ok) {
          const data = await response.json()
          const fileProgress = data.progress?.find(
            (p: { fileId: string; currentPage: number | null }) => p.fileId === fileId
          )
          if (fileProgress?.currentPage && !isRestoredRef.current) {
            isRestoredRef.current = true
            setPageNumber(fileProgress.currentPage)
          }
        }
      } catch (error) {
        console.error('Error fetching reading progress:', error)
      }
    }
    fetchProgress()
  }, [mediaId, fileId])

  const calcPercent = (page: number, total: number) =>
    total > 0 ? Math.round((page / total) * 100) : 0

  const saveProgress = useCallback(
    (page: number, total: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/media/${mediaId}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId,
              currentPage: page,
              totalPages: total,
              percentComplete: calcPercent(page, total),
            }),
          })
        } catch (error) {
          console.error('Error saving reading progress:', error)
        }
      }, 1500)
    },
    [mediaId, fileId]
  )

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages)
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => {
      const next = Math.max(prev - 1, 1)
      saveProgress(next, numPages)
      return next
    })
  }

  const goToNextPage = () => {
    setPageNumber((prev) => {
      const next = Math.min(prev + 1, numPages)
      saveProgress(next, numPages)
      return next
    })
  }

  const percentComplete = calcPercent(pageNumber, numPages)

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 shadow-lg max-h-[calc(100vh-12rem)] overflow-auto">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-8">
              <p className="text-gray-500 dark:text-gray-400">Loading PDF...</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            width={pageWidth}
          />
        </Document>
      </div>

      <div className="mt-4 flex items-center gap-4 bg-white dark:bg-gray-800 px-6 py-3 rounded-lg shadow-lg">
        <button
          onClick={goToPrevPage}
          disabled={pageNumber <= 1}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-gray-700 dark:text-gray-300">
            Page {pageNumber} of {numPages}
          </span>
          {numPages > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{percentComplete}%</span>
            </div>
          )}
        </div>
        <button
          onClick={goToNextPage}
          disabled={pageNumber >= numPages}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
