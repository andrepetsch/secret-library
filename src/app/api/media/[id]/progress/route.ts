import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mediaId } = await params

    const progress = await prisma.readingProgress.findMany({
      where: {
        userId: session.user.id,
        mediaId,
      },
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error fetching reading progress:', error)
    return NextResponse.json({ error: 'Failed to fetch reading progress' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mediaId } = await params
    const body = await req.json()
    const { fileId, currentPage, totalPages, currentLocation, percentComplete } = body

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    if (typeof percentComplete !== 'number' || percentComplete < 0) {
      return NextResponse.json({ error: 'percentComplete must be a number between 0 and 100' }, { status: 400 })
    }

    // Clamp to valid range
    const clampedPercent = Math.min(100, percentComplete)

    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_fileId: {
          userId: session.user.id,
          fileId,
        },
      },
      update: {
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        currentLocation: currentLocation ?? null,
        percentComplete: clampedPercent,
      },
      create: {
        userId: session.user.id,
        mediaId,
        fileId,
        currentPage: currentPage ?? null,
        totalPages: totalPages ?? null,
        currentLocation: currentLocation ?? null,
        percentComplete: clampedPercent,
      },
    })

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Error saving reading progress:', error)
    return NextResponse.json({ error: 'Failed to save reading progress' }, { status: 500 })
  }
}
