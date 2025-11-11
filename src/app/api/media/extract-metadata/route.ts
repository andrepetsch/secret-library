import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { extractMetadata, generateTags } from '@/lib/metadata'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Validate file type
    const fileType = file.type
    if (fileType !== 'application/epub+zip' && fileType !== 'application/pdf') {
      return NextResponse.json({ error: 'Only EPUB and PDF files are allowed' }, { status: 400 })
    }

    const normalizedFileType = fileType === 'application/epub+zip' ? 'epub' : 'pdf'

    // Extract metadata from the file
    const metadata = await extractMetadata(file, normalizedFileType)

    console.log('[Extract Metadata] Extracted metadata:', metadata)

    // Generate tags from title and description
    console.log('[Extract Metadata] Attempting to generate tags from title and description...')
    const generatedTags = await generateTags(metadata.title, metadata.description)
    if (generatedTags) {
      metadata.tags = generatedTags
      console.log('[Extract Metadata] Generated tags:', generatedTags)
    } else {
      console.log('[Extract Metadata] No tags were generated (check logs above for reason)')
    }

    return NextResponse.json({ 
      metadata,
      fileType: normalizedFileType
    })
  } catch (error) {
    console.error('Error extracting metadata:', error)
    return NextResponse.json({ error: 'Failed to extract metadata' }, { status: 500 })
  }
}
