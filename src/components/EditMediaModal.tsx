'use client'

import { useState } from 'react'

interface EditMediaModalProps {
  media: {
    id: string
    title: string
    author: string | null
    description: string | null
    language: string | null
    publicationDate: string | null
    mediaType: string
    tags: { id: string; name: string }[]
  }
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    id: string
    title: string
    author: string
    description: string
    language: string
    publicationDate: string
    mediaType: string
    tags: string
  }) => void
}

export function EditMediaModal({ media, isOpen, onClose, onSave }: EditMediaModalProps) {
  const [title, setTitle] = useState(media.title)
  const [author, setAuthor] = useState(media.author || '')
  const [description, setDescription] = useState(media.description || '')
  const [language, setLanguage] = useState(media.language || '')
  const [publicationDate, setPublicationDate] = useState(media.publicationDate || '')
  const [mediaType, setMediaType] = useState(media.mediaType)
  const [tags, setTags] = useState(media.tags.map(t => t.name).join(', '))
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        id: media.id,
        title,
        author,
        description,
        language,
        publicationDate,
        mediaType,
        tags
      })
      onClose()
    } catch (error) {
      console.error('Error saving media:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Media</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Author
              </label>
              <input
                type="text"
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <input
                type="text"
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g., en, de, fr"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="publicationDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Publication Date
              </label>
              <input
                type="text"
                id="publicationDate"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
                placeholder="e.g., 2023, 2023-06, 2023-06-15"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="mediaType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Media Type
              </label>
              <select
                id="mediaType"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="Book">Book</option>
                <option value="Magazine">Magazine</option>
                <option value="Paper">Paper</option>
                <option value="Article">Article</option>
              </select>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="fiction, sci-fi, thriller"
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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
