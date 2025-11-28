import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const collections = await prisma.collection.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        media: {
          where: {
            deletedAt: null
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
          }
        },
        _count: {
          select: {
            media: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ collections })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Check if collection with this name already exists for this user
    const existing = await prisma.collection.findUnique({
      where: {
        name_userId: {
          name: trimmedName,
          userId: session.user.id
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A collection with this name already exists' }, { status: 400 })
    }

    const collection = await prisma.collection.create({
      data: {
        name: trimmedName,
        description: description || null,
        userId: session.user.id
      },
      include: {
        media: {
          where: {
            deletedAt: null
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
          }
        },
        _count: {
          select: {
            media: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ collection })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
  }
}
