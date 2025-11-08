'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Media {
  id: string
  title: string
  author: string | null
  mediaType: string
  uploadedAt: string
  deletedAt: string
  files: { id: string; fileType: string }[]
  tags: { id: string; name: string }[]
  user: { name: string | null; email: string | null }
}

export default function DeletedMedia() {
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDeletedMedia()
  }, [])

  const fetchDeletedMedia = async () => {
    try {
      const response = await fetch('/api/media/deleted')
      if (response.ok) {
        const data = await response.json()
        setMedia(data.media)
      }
    } catch (error) {
      console.error('Error fetching deleted media:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (id: string) => {
    try {
      const response = await fetch(`/api/media/${id}/restore`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchDeletedMedia()
      } else {
        const error = await response.json()
        alert(`Error restoring media: ${error.error}`)
      }
    } catch (error) {
      console.error('Error restoring media:', error)
      alert('Failed to restore media')
    }
  }

  const getDaysUntilPermanentDelete = (deletedAt: string) => {
    const deleted = new Date(deletedAt)
    const weekFromDeletion = new Date(deleted)
    weekFromDeletion.setDate(weekFromDeletion.getDate() + 7)
    const now = new Date()
    const daysLeft = Math.ceil((weekFromDeletion.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysLeft)
  }

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
                href="/library"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Back to Library
              </Link>
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Deleted Media</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Items will be permanently deleted after one week
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading deleted media...</p>
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No deleted media found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {media.map((item) => {
              const daysLeft = getDaysUntilPermanentDelete(item.deletedAt)
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-2 border-red-200 dark:border-red-800"
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
                    <div className="flex gap-1">
                      {item.files.map((file) => (
                        <span
                          key={file.id}
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            file.fileType === 'epub' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {file.fileType.toUpperCase()}
                        </span>
                      ))}
                    </div>
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
                  <div className="mt-4 text-xs text-red-600 dark:text-red-400 font-medium">
                    {daysLeft > 0 ? (
                      `Will be permanently deleted in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                    ) : (
                      'Pending permanent deletion'
                    )}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-md"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
