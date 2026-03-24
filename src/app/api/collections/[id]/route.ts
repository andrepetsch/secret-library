import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const collectionInclude = {
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
  user: {
    select: {
      name: true,
      email: true,
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: collectionInclude
    })

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (!collection.isPublic && collection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: This collection is private' }, { status: 403 })
    }

    return NextResponse.json({ collection })
  } catch (error) {
    console.error('Error fetching collection:', error)
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, description, isPublic } = body

    const existingCollection = await prisma.collection.findUnique({
      where: { id }
    })

    if (!existingCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (existingCollection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own collections' }, { status: 403 })
    }

    // If name is being changed, check for duplicates
    if (name && name.trim() !== existingCollection.name) {
      const duplicate = await prisma.collection.findUnique({
        where: {
          name_userId: {
            name: name.trim(),
            userId: session.user.id
          }
        }
      })

      if (duplicate) {
        return NextResponse.json({ error: 'A collection with this name already exists' }, { status: 400 })
      }
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingCollection.name,
        description: description !== undefined ? description : existingCollection.description,
        isPublic: isPublic !== undefined ? isPublic === true : existingCollection.isPublic
      },
      include: collectionInclude
    })

    return NextResponse.json({ collection })
  } catch (error) {
    console.error('Error updating collection:', error)
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingCollection = await prisma.collection.findUnique({
      where: { id }
    })

    if (!existingCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    if (existingCollection.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You can only delete your own collections' }, { status: 403 })
    }

    await prisma.collection.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Collection deleted successfully' })
  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 })
  }
}

