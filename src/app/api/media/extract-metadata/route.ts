import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { extractMetadata } from '@/lib/metadata'

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

    return NextResponse.json({ 
      metadata,
      fileType: normalizedFileType
    })
  } catch (error) {
    console.error('Error extracting metadata:', error)
    return NextResponse.json({ error: 'Failed to extract metadata' }, { status: 500 })
  }
}
