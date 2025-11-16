'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ThemeToggle } from '@/components/ThemeToggle'

const EpubReader = dynamic(() => import('@/components/EpubReader'), { ssr: false })
const PdfReader = dynamic(() => import('@/components/PdfReader'), { ssr: false })

interface MediaFile {
  id: string
  fileUrl: string
  fileType: string
}

interface Media {
  id: string
  title: string
  author: string | null
  files: MediaFile[]
}

export default function ReaderPage() {
  const params = useParams()
  const [media, setMedia] = useState<Media | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)

  const handleDownload = () => {
    if (!selectedFile || !media) return
    
    const link = document.createElement('a')
    link.href = selectedFile.fileUrl
    link.download = `${media.title}.${selectedFile.fileType}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await fetch(`/api/media/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setMedia(data.media)
          // Auto-select first file or prefer EPUB if available
          if (data.media.files && data.media.files.length > 0) {
            const epubFile = data.media.files.find((f: MediaFile) => f.fileType === 'epub')
            setSelectedFile(epubFile || data.media.files[0])
          }
        }
      } catch (error) {
        console.error('Error fetching media:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMedia()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading media...</p>
      </div>
    )
  }

  if (!media || !selectedFile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {!media ? 'Media not found' : 'No files available'}
          </p>
          <Link href="/library" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Back to Library
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 dark:bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div>
              <h1 className="text-lg font-semibold">{media.title}</h1>
              {media.author && <p className="text-sm text-gray-300 dark:text-gray-400">{media.author}</p>}
            </div>
            <div className="flex items-center space-x-4">
              {media.files.length > 1 && (
                <select
                  value={selectedFile.id}
                  onChange={(e) => {
                    const file = media.files.find(f => f.id === e.target.value)
                    if (file) setSelectedFile(file)
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-700 dark:bg-gray-800 text-white border border-gray-600 rounded-md"
                >
                  {media.files.map(file => (
                    <option key={file.id} value={file.id}>
                      {file.fileType.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
              >
                Download {selectedFile.fileType.toUpperCase()}
              </button>
              <ThemeToggle />
              <Link
                href="/library"
                className="px-4 py-2 text-sm font-medium text-white bg-gray-700 dark:bg-gray-800 rounded-md hover:bg-gray-600 dark:hover:bg-gray-700"
              >
                Back to Library
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="h-[calc(100vh-4rem)]">
        {selectedFile.fileType === 'epub' ? (
          <EpubReader url={selectedFile.fileUrl} />
        ) : (
          <PdfReader url={selectedFile.fileUrl} />
        )}
      </div>
    </div>
  )
}
