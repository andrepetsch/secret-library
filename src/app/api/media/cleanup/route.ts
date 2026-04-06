import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/s3'

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate the date one week ago
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Find all media deleted more than a week ago
    const mediaToDelete = await prisma.media.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: oneWeekAgo
        }
      },
      include: {
        files: true
      }
    })

    if (mediaToDelete.length === 0) {
      return NextResponse.json({ 
        message: 'No media to permanently delete',
        deletedCount: 0 
      })
    }

    // Delete files from S3 storage
    const deletePromises = mediaToDelete.flatMap((media: { id: string; files: Array<{ id: string; fileUrl: string }>; coverUrl: string | null }) => {
      // Extract the file key from the S3 URL for deletion
      const extractKeyFromUrl = (url: string): string | null => {
        try {
          // S3 URL format: https://endpoint/bucketName/key
          const urlObj = new URL(url)
          const parts = urlObj.pathname.split('/').filter(p => p)
          // Remove bucket name from parts if present
          if (parts.length > 1 && parts[0] === process.env.S3_BUCKET_NAME) {
            return parts.slice(1).join('/')
          }
          return parts.join('/')
        } catch (error) {
          console.error(`Error parsing S3 URL: ${url}`, error)
          return null
        }
      }
      
      const promises = media.files
        .map(file => extractKeyFromUrl(file.fileUrl))
        .filter((key): key is string => key !== null)
        .map(async (key: string) => {
          try {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: key
            }))
          } catch (error) {
            console.error(`Error deleting S3 object for file ${file.id}:`, error)
            // Continue even if deletion fails
          }
        })
      
      // Also delete cover if exists
      if (media.coverUrl) {
        const coverKey = extractKeyFromUrl(media.coverUrl)
        if (coverKey) {
          promises.push(
            s3Client.send(new DeleteObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME,
              Key: coverKey
            })).catch(error => {
              console.error(`Error deleting S3 cover for media ${media.id}:`, error)
            })
          )
        }
      }
      
      return promises
    })

    await Promise.all(deletePromises)

    // Permanently delete from database
    const result = await prisma.media.deleteMany({
      where: {
        id: {
          in: mediaToDelete.map((m: { id: string }) => m.id)
        }
      }
    })

    return NextResponse.json({ 
      message: `Successfully deleted ${result.count} media items permanently`,
      deletedCount: result.count
    })
  } catch (error) {
    console.error('Error cleaning up media:', error)
    return NextResponse.json({ error: 'Failed to clean up media' }, { status: 500 })
  }
}
