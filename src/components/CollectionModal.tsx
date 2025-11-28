'use client'

import { useState } from 'react'

interface Collection {
  id: string
  name: string
  description: string | null
  _count: { media: number }
}

interface CollectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; description: string }) => Promise<void>
  collection?: Collection | null
  mode: 'create' | 'edit'
}

export function CollectionModal({ isOpen, onClose, onSave, collection, mode }: CollectionModalProps) {
  const [name, setName] = useState(collection?.name || '')
  const [description, setDescription] = useState(collection?.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!name.trim()) {
      setError('Collection name is required')
      return
    }

    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description.trim() })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save collection')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === 'create' ? 'Create Collection' : 'Edit Collection'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Science Fiction, John Doe Books"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional description for this collection"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

interface AddToCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  collections: Collection[]
  mediaId: string
  mediaTitle: string
  onAdd: (collectionId: string) => Promise<void>
  onCreateNew: () => void
}

export function AddToCollectionModal({ 
  isOpen, 
  onClose, 
  collections, 
  mediaTitle,
  onAdd,
  onCreateNew
}: AddToCollectionModalProps) {
  const [adding, setAdding] = useState<string | null>(null)

  const handleAdd = async (collectionId: string) => {
    setAdding(collectionId)
    try {
      await onAdd(collectionId)
      onClose()
    } catch (error) {
      console.error('Error adding to collection:', error)
    } finally {
      setAdding(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Add to Collection
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Select a collection for &quot;{mediaTitle}&quot;
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {collections.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No collections yet. Create one to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => handleAdd(collection.id)}
                  disabled={adding !== null}
                  className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {collection.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {collection._count.media} item{collection._count.media !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {adding === collection.id && (
                      <span className="text-sm text-blue-600 dark:text-blue-400">Adding...</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={onCreateNew}
            className="w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md border border-blue-600 dark:border-blue-400"
          >
            + Create New Collection
          </button>
        </div>
      </div>
    </div>
  )
}
