'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const EpubReader = dynamic(() => import('@/components/EpubReader'), { ssr: false })
const PdfReader = dynamic(() => import('@/components/PdfReader'), { ssr: false })

interface Book {
  id: string
  title: string
  author: string | null
  fileUrl: string
  fileType: string
}

export default function ReaderPage() {
  const params = useParams()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await fetch(`/api/books/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setBook(data.book)
        }
      } catch (error) {
        console.error('Error fetching book:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchBook()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading book...</p>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Book not found</p>
          <Link href="/library" className="text-blue-600 hover:text-blue-800">
            Back to Library
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div>
              <h1 className="text-lg font-semibold">{book.title}</h1>
              {book.author && <p className="text-sm text-gray-300">{book.author}</p>}
            </div>
            <Link
              href="/library"
              className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600"
            >
              Back to Library
            </Link>
          </div>
        </div>
      </nav>

      <div className="h-[calc(100vh-4rem)]">
        {book.fileType === 'epub' ? (
          <EpubReader url={book.fileUrl} />
        ) : (
          <PdfReader url={book.fileUrl} />
        )}
      </div>
    </div>
  )
}
