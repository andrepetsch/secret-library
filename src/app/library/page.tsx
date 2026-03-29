'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { EditMediaModal } from '@/components/EditMediaModal'
import { CollectionModal, AddToCollectionModal } from '@/components/CollectionModal'
import { UserSettingsModal } from '@/components/UserSettingsModal'

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
  readingProgress: {
    fileId: string
    percentComplete: number
    currentPage: number | null
    totalPages: number | null
    currentLocation: string | null
    updatedAt: string
  }[]
}

interface Collection {
  id: string
  name: string
  description: string | null
  isPublic: boolean
  userId: string
  user: { name: string | null; email: string | null }
  media: Media[]
  _count: { media: number }
}

interface CurrentUser {
  id: string
  kindleEmail?: string | null
}

export default function Library() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [media, setMedia] = useState<Media[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [editingMedia, setEditingMedia] = useState<Media | null>(null)
  const [showDeletedLink, setShowDeletedLink] = useState(false)
  const [viewMode, setViewMode] = useState<'all' | 'collections'>('all')
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [addToCollectionMedia, setAddToCollectionMedia] = useState<Media | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [sendingToKindle, setSendingToKindle] = useState<string | null>(null)
  const [progressFilter, setProgressFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all')

  useEffect(() => {
    fetchCurrentUser()
    fetchMedia()
    fetchCollections()
    checkDeletedMedia()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/user/settings')
      if (response.ok) {
        const data = await response.json()
        setCurrentUser({
          id: data.user.id,
          kindleEmail: data.user.kindleEmail,
        })
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

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

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections')
      if (response.ok) {
        const data = await response.json()
        setCollections(data.collections)
        if (data.currentUserId) {
          setCurrentUser({ id: data.currentUserId })
        }
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    }
  }

  const checkDeletedMedia = async () => {
    try {
      const response = await fetch('/api/media/deleted')
      if (response.ok) {
        const data = await response.json()
        setShowDeletedLink(data.media.length > 0)
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
        await fetchCollections()
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

  const handleCreateCollection = async (data: { name: string; description: string; isPublic: boolean }) => {
    const response = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create collection')
    }

    await fetchCollections()
  }

  const handleEditCollection = async (data: { name: string; description: string; isPublic: boolean }) => {
    if (!editingCollection) return

    const response = await fetch(`/api/collections/${editingCollection.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update collection')
    }

    await fetchCollections()
    setEditingCollection(null)
  }

  const handleDeleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection? The media items will not be deleted.')) {
      return
    }

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCollections()
        if (selectedCollection?.id === collectionId) {
          setSelectedCollection(null)
        }
      } else {
        const error = await response.json()
        alert(`Error deleting collection: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
      alert('Failed to delete collection')
    }
  }

  const handleAddToCollection = async (collectionId: string) => {
    if (!addToCollectionMedia) return

    const response = await fetch(`/api/collections/${collectionId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaId: addToCollectionMedia.id }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add to collection')
    }

    await fetchCollections()
    setAddToCollectionMedia(null)
  }

  const handleRemoveFromCollection = async (collectionId: string, mediaId: string) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/media?mediaId=${mediaId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        // Update collections state with the updated collection
        setCollections(prev => prev.map(c => 
          c.id === collectionId ? data.collection : c
        ))
        // Update selected collection if it's the one we just modified
        if (selectedCollection?.id === collectionId) {
          setSelectedCollection(data.collection)
        }
      } else {
        const error = await response.json()
        alert(`Error removing from collection: ${error.error}`)
      }
    } catch (error) {
      console.error('Error removing from collection:', error)
      alert('Failed to remove from collection')
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

  const canManageCollection = (collection: Collection) => {
    return currentUser?.id === collection.userId
  }

  // Own collections only (for AddToCollectionModal)
  const ownCollections = collections.filter(c => c.userId === currentUser?.id)

  const handleSendToKindle = async (mediaId: string) => {
    if (!currentUser?.kindleEmail) {
      if (confirm('You have no Kindle email configured. Would you like to add one in Settings?')) {
        setShowSettingsModal(true)
      }
      return
    }

    setSendingToKindle(mediaId)
    try {
      const response = await fetch(`/api/media/${mediaId}/send-to-kindle`, {
        method: 'POST',
      })
      const data = await response.json()
      if (response.ok) {
        alert(data.message)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error sending to Kindle:', error)
      alert('Failed to send to Kindle')
    } finally {
      setSendingToKindle(null)
    }
  }

  const handleSettingsSave = (settings: { name: string; kindleEmail: string }) => {
    setCurrentUser((prev) => ({
      id: prev?.id || '',
      kindleEmail: settings.kindleEmail || null,
    }))
  }

  // Get the best (highest) reading progress across all files for a media item.
  // A media may have both EPUB and PDF files; we use the highest progress to
  // reflect the furthest the user has read regardless of file type.
  const getMediaProgress = (item: Media): number => {
    if (!item.readingProgress || item.readingProgress.length === 0) return 0
    return Math.max(...item.readingProgress.map(p => p.percentComplete))
  }

  // Get the display media based on view mode and filters
  const getDisplayMedia = () => {
    let mediaToShow: Media[]
    
    if (viewMode === 'collections' && selectedCollection) {
      mediaToShow = selectedCollection.media
    } else {
      mediaToShow = media
    }

    // Apply filter
    return mediaToShow.filter(item => {
      const matchesSearch = (
        item.title.toLowerCase().includes(filter.toLowerCase()) ||
        item.author?.toLowerCase().includes(filter.toLowerCase()) ||
        item.tags.some(tag => tag.name.toLowerCase().includes(filter.toLowerCase()))
      )

      if (!matchesSearch) return false

      if (progressFilter === 'all') return true
      const progress = getMediaProgress(item)
      if (progressFilter === 'not_started') return progress === 0
      if (progressFilter === 'in_progress') return progress > 0 && progress < 100
      if (progressFilter === 'completed') return progress >= 100
      return true
    })
  }

  const filteredMedia = getDisplayMedia()

  // Filter collections by name
  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase())
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
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Settings
              </button>
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
        {/* View Mode Toggle */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => {
                setViewMode('all')
                setSelectedCollection(null)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              All Media
            </button>
            <button
              onClick={() => {
                setViewMode('collections')
                setSelectedCollection(null)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'collections'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Collections
            </button>
          </div>
          {viewMode === 'collections' && (
            <button
              onClick={() => setShowCollectionModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
            >
              + New Collection
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder={viewMode === 'collections' && !selectedCollection 
              ? "Search collections..." 
              : "Search by title, author, or tag..."}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          {(viewMode === 'all' || selectedCollection) && (
            <select
              value={progressFilter}
              onChange={(e) => setProgressFilter(e.target.value as typeof progressFilter)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          )}
        </div>

        {/* Breadcrumb for collection view */}
        {viewMode === 'collections' && selectedCollection && (
          <div className="mb-6 flex items-center gap-3 text-sm flex-wrap">
            <div className="flex items-center">
              <button
                onClick={() => setSelectedCollection(null)}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Collections
              </button>
              <span className="mx-2 text-gray-500">/</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {selectedCollection.name}
              </span>
            </div>
            {selectedCollection.isPublic ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                </svg>
                Public
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Private
              </span>
            )}
            {!canManageCollection(selectedCollection) && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                by {selectedCollection.user.name || selectedCollection.user.email}
              </span>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : viewMode === 'collections' && !selectedCollection ? (
          /* Collections Grid View */
          filteredCollections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {collections.length === 0 
                  ? "No collections yet. Create one to organize your media!"
                  : "No collections match your search."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCollections.map((collection) => (
                <div
                  key={collection.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
                  onClick={() => setSelectedCollection(collection)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {collection.name}
                        </h3>
                        {collection.isPublic ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                            </svg>
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Private
                          </span>
                        )}
                      </div>
                      {!canManageCollection(collection) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          by {collection.user.name || collection.user.email}
                        </p>
                      )}
                      {collection.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                      <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        {collection._count.media} item{collection._count.media !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {canManageCollection(collection) && (
                    <div className="mt-4 flex gap-2 border-t dark:border-gray-700 pt-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingCollection(collection)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md border border-blue-600 dark:border-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCollection(collection.id)}
                        className="flex-1 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md border border-red-600 dark:border-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {selectedCollection 
                ? "No media in this collection yet. Add some from the All Media view!"
                : "No media found. Upload your first item!"}
            </p>
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
                  {(() => {
                    const progress = getMediaProgress(item)
                    if (progress === 0) return null
                    return (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>{progress >= 100 ? '✓ Completed' : 'In progress'}</span>
                          <span>{Math.min(progress, 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}
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

                {/* Collection and Edit actions */}
                <div className="mt-2 flex gap-2">
                  {selectedCollection && canManageCollection(selectedCollection) && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        handleRemoveFromCollection(selectedCollection.id, item.id)
                      }}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md border border-orange-600 dark:border-orange-400"
                    >
                      Remove from Collection
                    </button>
                  )}
                  {!selectedCollection && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setAddToCollectionMedia(item)
                      }}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-md border border-yellow-600 dark:border-yellow-400"
                    >
                      Add to Collection
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      handleSendToKindle(item.id)
                    }}
                    disabled={sendingToKindle === item.id}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-md border border-teal-600 dark:border-teal-400 disabled:opacity-50"
                  >
                    {sendingToKindle === item.id ? 'Sending...' : '📖 Send to Kindle'}
                  </button>
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

      {/* Collection Modals */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        onSave={handleCreateCollection}
        mode="create"
      />

      {editingCollection && (
        <CollectionModal
          isOpen={true}
          onClose={() => setEditingCollection(null)}
          onSave={handleEditCollection}
          collection={editingCollection}
          mode="edit"
        />
      )}

      {addToCollectionMedia && (
        <AddToCollectionModal
          isOpen={true}
          onClose={() => setAddToCollectionMedia(null)}
          collections={ownCollections}
          mediaId={addToCollectionMedia.id}
          mediaTitle={addToCollectionMedia.title}
          onAdd={handleAddToCollection}
          onCreateNew={() => {
            setAddToCollectionMedia(null)
            setShowCollectionModal(true)
          }}
        />
      )}

      <UserSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSettingsSave}
      />
    </div>
  )
}
