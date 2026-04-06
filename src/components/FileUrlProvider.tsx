'use client'

import { useEffect, useState } from 'react'

export default function FileUrlProvider({
  mediaId,
  fileId,
  children,
}: {
  mediaId: string
  fileId: string
  children: (url: string | null) => React.ReactNode
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFileUrl = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/media/${mediaId}/file?fileId=${fileId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch file URL')
        }
        
        const data = await response.json()
        setFileUrl(data.url)
      } catch (err) {
        console.error('Error fetching file URL:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch file URL')
      } finally {
        setLoading(false)
      }
    }
    
    fetchFileUrl()
  }, [mediaId, fileId])

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading file...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>
  }

  return <>{children(fileUrl)}</>
}