'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

interface Book {
  id: string
  title: string
  author: string | null
  fileType: string
  uploadedAt: string
  tags: { id: string; name: string }[]
  user: { name: string | null; email: string | null }
}

export default function Library() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books')
      if (response.ok) {
        const data = await response.json()
        setBooks(data.books)
      }
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(filter.toLowerCase()) ||
    book.author?.toLowerCase().includes(filter.toLowerCase()) ||
    book.tags.some(tag => tag.name.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Secret Library</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/upload"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Upload Book
              </Link>
              <Link
                href="/invitations"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Invitations
              </Link>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
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
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No books found. Upload your first book!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <Link
                key={book.id}
                href={`/reader/${book.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {book.title}
                    </h3>
                    {book.author && (
                      <p className="text-sm text-gray-600 mt-1">{book.author}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    book.fileType === 'epub' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {book.fileType.toUpperCase()}
                  </span>
                </div>
                {book.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {book.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 text-xs text-gray-500">
                  Uploaded by {book.user.name || book.user.email}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
