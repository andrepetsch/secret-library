'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { EditMediaModal } from '@/components/EditMediaModal'

interface Media {
  id: string
  title: string
  author: string | null
  description: string | null
  language: string | null
  publicationDate: string | null
  mediaType: string
  uploadedAt: string
  uploadedBy: string
  files: { id: string; fileType: string; fileUrl: string }[]
  tags: { id: string; name: string }[]
  user: { name: string | null; email: string | null }
}

interface CurrentUser {
  id: string
}

export default function Library() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [media, setMedia] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [editingMedia, setEditingMedia] = useState<Media | null>(null)
  const [showDeletedLink, setShowDeletedLink] = useState(false)

  useEffect(() => {
    fetchCurrentUser()
    fetchMedia()
    checkDeletedMedia()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCurrentUser = async () => {
    // Get current user session by checking who we are
    // We infer the user from the media they uploaded
    // The actual user ID will be set when fetching media or deleted media
  }

  const fetchMedia = async () => {
    try {
      const response = await fetch('/api/media')
      if (response.ok) {
        const data = await response.json()
        setMedia(data.media)
        // Extract current user ID from the first media item the user uploaded
        // This is a workaround - ideally we'd have a /api/me endpoint
        const userMedia = data.media.find((m: Media) => m.uploadedBy)
        if (userMedia) {
          setCurrentUser({ id: userMedia.uploadedBy })
        }
      }
    } catch (error) {
      console.error('Error fetching media:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkDeletedMedia = async () => {
    try {
      const response = await fetch('/api/media/deleted')
      if (response.ok) {
        const data = await response.json()
        setShowDeletedLink(data.media.length > 0)
        // Also try to get current user from deleted media if not already set
        if (!currentUser && data.media.length > 0) {
          setCurrentUser({ id: data.media[0].uploadedBy })
        }
      }
    } catch (error) {
      console.error('Error checking deleted media:', error)
    }
  }

  const handleEdit = async (data: {
    id: string
    title: string
    author: string
    description: string
    language: string
    publicationDate: string
    mediaType: string
    tags: string
  }) => {
    try {
      const response = await fetch(`/api/media/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        await fetchMedia()
        setEditingMedia(null)
      } else {
        const error = await response.json()
        alert(`Error updating media: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating media:', error)
      alert('Failed to update media')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media? You can restore it within one week.')) {
      return
    }

    try {
      const response = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchMedia()
        await checkDeletedMedia()
      } else {
        const error = await response.json()
        alert(`Error deleting media: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting media:', error)
      alert('Failed to delete media')
    }
  }

  const handleDownload = (fileUrl: string, title: string, fileType: string) => {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = `${title}.${fileType}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const canEditMedia = (item: Media) => {
    return currentUser?.id === item.uploadedBy
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
              {showDeletedLink && (
                <Link
                  href="/library/deleted"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  Deleted Items
                </Link>
              )}
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
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <Link href={`/reader/${item.id}`} className="block">
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
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Uploaded by {item.user.name || item.user.email}
                  </div>
                </Link>
                
                {/* Download buttons - available to all users */}
                <div className="mt-4 flex gap-2 border-t dark:border-gray-700 pt-4">
                  {item.files.length === 1 ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleDownload(item.files[0].fileUrl, item.title, item.files[0].fileType)
                      }}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md border border-purple-600 dark:border-purple-400"
                    >
                      Download {item.files[0].fileType.toUpperCase()}
                    </button>
                  ) : (
                    item.files.map((file) => (
                      <button
                        key={file.id}
                        onClick={(e) => {
                          e.preventDefault()
                          handleDownload(file.fileUrl, item.title, file.fileType)
                        }}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md border border-purple-600 dark:border-purple-400"
                      >
                        Download {file.fileType.toUpperCase()}
                      </button>
                    ))
                  )}
                </div>
                
                {canEditMedia(item) && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setEditingMedia(item)
                      }}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md border border-blue-600 dark:border-blue-400"
                    >
                      Edit
                    </button>
                    {item.files.length < 2 && (
                      <Link
                        href={`/upload?mediaId=${item.id}`}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-center text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md border border-green-600 dark:border-green-400"
                      >
                        Add File
                      </Link>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleDelete(item.id)
                      }}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md border border-red-600 dark:border-red-400"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editingMedia && (
        <EditMediaModal
          media={editingMedia}
          isOpen={true}
          onClose={() => setEditingMedia(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  )
}
