'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Media {
  id: string
  title: string
  files: { id: string; fileType: string }[]
}

function UploadForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mediaId = searchParams.get('mediaId')
  
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [existingMedia, setExistingMedia] = useState<Media | null>(null)
  const [isAddingToExisting, setIsAddingToExisting] = useState(false)

  useEffect(() => {
    if (mediaId) {
      fetchMedia(mediaId)
    }
  }, [mediaId])

  const fetchMedia = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}`)
      if (response.ok) {
        const data = await response.json()
        setExistingMedia(data.media)
        setIsAddingToExisting(true)
      }
    } catch (error) {
      console.error('Error fetching media:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    // Add mediaId if adding to existing media
    if (isAddingToExisting && existingMedia) {
      formData.append('mediaId', existingMedia.id)
    }

    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        router.push('/library')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to upload media')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('Failed to upload media')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          {isAddingToExisting ? `Add File to: ${existingMedia?.title}` : 'Upload Media'}
        </h2>

        {isAddingToExisting && existingMedia && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Adding file to existing media. Current files: {existingMedia.files.map(f => f.fileType.toUpperCase()).join(', ')}
            </p>
            <button
              onClick={() => {
                setIsAddingToExisting(false)
                setExistingMedia(null)
                router.push('/upload')
              }}
              className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Upload as new media instead
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              File (EPUB or PDF) *
            </label>
            <input
              type="file"
              id="file"
              name="file"
              accept=".epub,.pdf,application/epub+zip,application/pdf"
              required
              className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                dark:file:bg-blue-900/30 dark:file:text-blue-300
                hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
            />
          </div>

          {!isAddingToExisting && (
            <>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="mediaType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Media Type *
                </label>
                <select
                  id="mediaType"
                  name="mediaType"
                  defaultValue="Book"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Book">Book</option>
                  <option value="Magazine">Magazine</option>
                  <option value="Paper">Paper</option>
                  <option value="Article">Article</option>
                </select>
              </div>

              <div>
                <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Author
                </label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  placeholder="fiction, science-fiction, fantasy"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-4">
            <Link
              href="/library"
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : isAddingToExisting ? 'Add File' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Upload() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/library" className="text-xl font-bold text-gray-900 dark:text-white">
                Secret Library
              </Link>
            </div>
            <div className="flex items-center">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      <Suspense fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      }>
        <UploadForm />
      </Suspense>
    </div>
  )
}
