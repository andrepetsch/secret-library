import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only fetch deleted media for the current user
    const media = await prisma.media.findMany({
      where: {
        deletedAt: { not: null },
        uploadedBy: session.user.id
      },
      include: {
        files: true,
        tags: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        deletedAt: 'desc'
      }
    })

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error fetching deleted media:', error)
    return NextResponse.json({ error: 'Failed to fetch deleted media' }, { status: 500 })
  }
}
