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
      }
    })

    if (mediaToDelete.length === 0) {
      return NextResponse.json({ 
        message: 'No media to permanently delete',
        deletedCount: 0 
      })
    }

    // Delete files from blob storage
    const deletePromises = mediaToDelete.map(async (media) => {
      try {
        await del(media.fileUrl)
        if (media.coverUrl) {
          await del(media.coverUrl)
        }
      } catch (error) {
        console.error(`Error deleting blob for media ${media.id}:`, error)
        // Continue even if blob deletion fails
      }
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
