import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateTags } from '@/lib/metadata'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description } = body

    if (!title && !description) {
      return NextResponse.json({ error: 'Title or description is required' }, { status: 400 })
    }

    console.log('[Generate Tags API] Generating tags for:', { title, description })

    // Generate tags from title and description
    const tags = await generateTags(title, description)

    return NextResponse.json({ 
      tags: tags || null
    })
  } catch (error) {
    console.error('Error generating tags:', error)
    return NextResponse.json({ error: 'Failed to generate tags' }, { status: 500 })
  }
}
