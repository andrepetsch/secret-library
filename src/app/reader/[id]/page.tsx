'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ThemeToggle } from '@/components/ThemeToggle'

const EpubReader = dynamic(() => import('@/components/EpubReader'), { ssr: false })
const PdfReader = dynamic(() => import('@/components/PdfReader'), { ssr: false })

interface Media {
  id: string
  title: string
  author: string | null
  fileUrl: string
  fileType: string
}

export default function ReaderPage() {
  const params = useParams()
  const [media, setMedia] = useState<Media | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await fetch(`/api/media/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setMedia(data.media)
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

  if (!media) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Media not found</p>
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
        {media.fileType === 'epub' ? (
          <EpubReader url={media.fileUrl} />
        ) : (
          <PdfReader url={media.fileUrl} />
        )}
      </div>
    </div>
  )
}
