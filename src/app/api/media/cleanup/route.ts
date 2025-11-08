import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { del } from '@vercel/blob'

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

    // Delete files from blob storage
    const deletePromises = mediaToDelete.flatMap((media) => {
      const promises = media.files.map(async (file) => {
        try {
          await del(file.fileUrl)
        } catch (error) {
          console.error(`Error deleting blob for file ${file.id}:`, error)
          // Continue even if blob deletion fails
        }
      })
      
      // Also delete cover if exists
      if (media.coverUrl) {
        promises.push(
          (async () => {
            try {
              await del(media.coverUrl!)
            } catch (error) {
              console.error(`Error deleting cover for media ${media.id}:`, error)
            }
          })()
        )
      }
      
      return promises
    })

    await Promise.all(deletePromises)

    // Permanently delete from database
    const result = await prisma.media.deleteMany({
      where: {
        id: {
          in: mediaToDelete.map(m => m.id)
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
