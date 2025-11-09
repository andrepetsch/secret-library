'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { upload } from '@vercel/blob/client'
import { extractMetadataClient } from '@/lib/metadata-client'

interface Media {
  id: string
  title: string
  files: { id: string; fileType: string }[]
}

interface ExtractedMetadata {
  title?: string
  author?: string
  description?: string
  language?: string
  publicationDate?: string
}

function UploadForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mediaId = searchParams.get('mediaId')
  
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState('')
  const [existingMedia, setExistingMedia] = useState<Media | null>(null)
  const [isAddingToExisting, setIsAddingToExisting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [extractedMetadata, setExtractedMetadata] = useState<ExtractedMetadata | null>(null)
  const [formValues, setFormValues] = useState({
    title: '',
    author: '',
    description: '',
    language: '',
    publicationDate: '',
    mediaType: 'Book'
  })

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setSelectedFile(null)
      setExtractedMetadata(null)
      return
    }

    setSelectedFile(file)
    setError('')
    
    // Don't extract metadata if adding to existing media
    if (isAddingToExisting) {
      return
    }

    // Extract metadata from the file (client-side)
    setExtracting(true)
    try {
      const metadata = await extractMetadataClient(file)
      console.log('[Upload] Extracted metadata client-side:', metadata)
      setExtractedMetadata(metadata)
      
      // Pre-fill form with extracted metadata
      setFormValues({
        title: metadata.title || '',
        author: metadata.author || '',
        description: metadata.description || '',
        language: metadata.language || '',
        publicationDate: metadata.publicationDate || '',
        mediaType: 'Book'
      })
    } catch (error) {
      console.error('Error extracting metadata:', error)
      // Don't show error to user, just continue with empty form
    } finally {
      setExtracting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormValues(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    setError('')

    if (!selectedFile) {
      setError('Please select a file')
      setUploading(false)
      return
    }

    try {
      // Prepare metadata payload
      const metadata: Record<string, string> = {}
      
      if (isAddingToExisting && existingMedia) {
        metadata.mediaId = existingMedia.id
      } else {
        metadata.title = formValues.title
        metadata.author = formValues.author
        metadata.description = formValues.description
        metadata.language = formValues.language
        metadata.publicationDate = formValues.publicationDate
        metadata.mediaType = formValues.mediaType
        
        const tagsInput = (document.getElementById('tags') as HTMLInputElement)?.value
        if (tagsInput) {
          metadata.tags = tagsInput
        }
      }

      // Upload directly to Vercel Blob using client-side upload
      const blob = await upload(selectedFile.name, selectedFile, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify(metadata),
      })

      console.log('Upload successful:', blob.url)
      console.log('Download URL:', blob.downloadUrl)
      
      // Create media record in database after upload completes
      // This is more reliable than relying on the onUploadCompleted webhook
      // Use downloadUrl instead of url for proper CORS and content-type headers
      const createMediaResponse = await fetch('/api/media/create-from-blob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blobUrl: blob.downloadUrl,
          contentType: blob.contentType,
          ...metadata
        }),
      })

      if (!createMediaResponse.ok) {
        const errorData = await createMediaResponse.json()
        throw new Error(errorData.error || 'Failed to create media record')
      }

      router.push('/library')
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload media')
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

        {extracting && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded">
            Extracting metadata from file...
          </div>
        )}

        {extractedMetadata && !isAddingToExisting && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded">
            <p className="font-medium">Metadata extracted successfully!</p>
            <p className="text-sm mt-1">You can review and edit the information below before uploading.</p>
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
              onChange={handleFileChange}
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
                  value={formValues.title}
                  onChange={handleInputChange}
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
                  value={formValues.mediaType}
                  onChange={handleInputChange}
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
                  value={formValues.author}
                  onChange={handleInputChange}
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
                  value={formValues.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Language
                </label>
                <input
                  type="text"
                  id="language"
                  name="language"
                  placeholder="e.g., en, de, fr"
                  value={formValues.language}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              <div>
                <label htmlFor="publicationDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Publication Date
                </label>
                <input
                  type="text"
                  id="publicationDate"
                  name="publicationDate"
                  placeholder="e.g., 2023, 2023-06, 2023-06-15"
                  value={formValues.publicationDate}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
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
