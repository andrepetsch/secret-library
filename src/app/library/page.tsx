'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Media {
  id: string
  title: string
  author: string | null
  fileType: string
  mediaType: string
  uploadedAt: string
  tags: { id: string; name: string }[]
  user: { name: string | null; email: string | null }
}

export default function Library() {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    try {
      const response = await fetch('/api/media')
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

  const filteredMedia = media.filter(item => 
    item.title.toLowerCase().includes(filter.toLowerCase()) ||
    item.author?.toLowerCase().includes(filter.toLowerCase()) ||
    item.tags.some(tag => tag.name.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Secret Library</h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link
                href="/upload"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Upload Media
              </Link>
              <Link
                href="/invitations"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Invitations
              </Link>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by title, author, or tag..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading media...</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No media found. Upload your first item!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia.map((item) => (
              <Link
                key={item.id}
                href={`/reader/${item.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    {item.author && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.author}</p>
                    )}
                    <span className="inline-block mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {item.mediaType}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    item.fileType === 'epub' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {item.fileType.toUpperCase()}
                  </span>
                </div>
                {item.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Uploaded by {item.user.name || item.user.email}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
