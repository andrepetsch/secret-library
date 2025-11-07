import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const author = formData.get('author') as string | null
    const description = formData.get('description') as string | null
    const tags = formData.get('tags') as string | null
    const mediaType = formData.get('mediaType') as string | null

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    // Validate file type
    const fileType = file.type
    if (fileType !== 'application/epub+zip' && fileType !== 'application/pdf') {
      return NextResponse.json({ error: 'Only EPUB and PDF files are allowed' }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    })

    // Create media record
    const media = await prisma.media.create({
      data: {
        title,
        author: author || null,
        description: description || null,
        fileUrl: blob.url,
        fileType: fileType === 'application/epub+zip' ? 'epub' : 'pdf',
        mediaType: mediaType || 'Book',
        uploadedBy: session.user.id,
      }
    })

    // Handle tags
    if (tags) {
      const tagNames = tags.split(',').map(t => t.trim()).filter(t => t)
      
      for (const tagName of tagNames) {
        // Find or create tag
        let tag = await prisma.tag.findUnique({
          where: { name: tagName }
        })

        if (!tag) {
          tag = await prisma.tag.create({
            data: { name: tagName }
          })
        }

        // Connect tag to media
        await prisma.media.update({
          where: { id: media.id },
          data: {
            tags: {
              connect: { id: tag.id }
            }
          }
        })
      }
    }

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error uploading media:', error)
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const media = await prisma.media.findMany({
      include: {
        tags: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    })

    return NextResponse.json({ media })
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 })
  }
}
