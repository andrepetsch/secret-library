/**
 * One-time migration script: Vercel Blob → Strato HiDrive S3
 *
 * Finds every MediaFile row whose fileUrl is a full Vercel Blob HTTPS URL,
 * downloads the file, re-uploads it to S3, and updates the database record
 * to store the new S3 key (e.g. "uploads/{userId}/{nanoid}.{ext}").
 *
 * Usage:
 *   npx tsx scripts/migrate-blob-to-s3.ts            # live run
 *   npx tsx scripts/migrate-blob-to-s3.ts --dry-run  # preview only, no changes
 *
 * Required environment variables (loaded from .env automatically):
 *   DATABASE_URL, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME
 *
 * Optional environment variables:
 *   S3_REGION            — defaults to "us-east-1"
 *   BLOB_READ_WRITE_TOKEN — needed if blobs are private (Vercel Blob token)
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { nanoid } from 'nanoid'

// Matches Vercel Blob storage URLs:
//   https://<hash>.public.blob.vercel-storage.com/...
//   https://<hash>.blob.vercel-storage.com/...
const VERCEL_BLOB_URL_PATTERN =
  /^https:\/\/[^/]+\.(?:public\.blob|blob)\.vercel-storage\.com\//

const prisma = new PrismaClient()

function buildS3Client(): S3Client {
  const required = [
    'S3_ENDPOINT',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME',
  ] as const

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }

  return new S3Client({
    endpoint: process.env.S3_ENDPOINT!,
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // required for non-AWS S3-compatible storage
  })
}

async function downloadFromVercelBlob(url: string): Promise<Buffer> {
  const headers: Record<string, string> = {}

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    throw new Error(
      `Failed to download blob (HTTP ${response.status} ${response.statusText}): ${url}`
    )
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log('=================================================')
  console.log('  Vercel Blob → S3 Migration Script')
  console.log('=================================================')

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN — no files will be downloaded, uploaded, or')
    console.log('   updated in the database.\n')
  }

  // Fetch all MediaFile records that still contain a full HTTPS URL
  const candidates = await prisma.mediaFile.findMany({
    where: {
      fileUrl: { startsWith: 'https://' },
    },
    include: {
      media: {
        select: { uploadedBy: true, title: true },
      },
    },
  })

  // Filter to only Vercel Blob URLs (ignore any other HTTPS URLs that may exist)
  const blobFiles = candidates.filter((f) =>
    VERCEL_BLOB_URL_PATTERN.test(f.fileUrl)
  )

  console.log(`Found ${blobFiles.length} MediaFile record(s) to migrate.\n`)

  if (blobFiles.length === 0) {
    console.log('✅ Nothing to migrate. All files are already on S3.')
    return
  }

  const s3Client = buildS3Client()
  const bucket = process.env.S3_BUCKET_NAME!

  let succeeded = 0
  let failed = 0
  const errors: { title: string; id: string; error: string }[] = []

  for (const mediaFile of blobFiles) {
    const index = succeeded + failed + 1
    const { id, fileUrl, fileType } = mediaFile
    const userId = mediaFile.media.uploadedBy
    const title = mediaFile.media.title

    const contentType =
      fileType === 'epub' ? 'application/epub+zip' : 'application/pdf'
    const s3Key = `uploads/${userId}/${nanoid()}.${fileType}`

    console.log(`[${index}/${blobFiles.length}] "${title}" (${fileType.toUpperCase()})`)
    console.log(`  ID:   ${id}`)
    console.log(`  From: ${fileUrl}`)
    console.log(`  To:   ${s3Key}`)

    if (isDryRun) {
      console.log('  ↳ skipped (dry run)\n')
      succeeded++
      continue
    }

    try {
      // 1. Download from Vercel Blob
      process.stdout.write('  Downloading... ')
      const fileBuffer = await downloadFromVercelBlob(fileUrl)
      console.log(`${(fileBuffer.length / 1024).toFixed(1)} KB`)

      // 2. Upload to S3
      process.stdout.write('  Uploading to S3... ')
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucket,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: contentType,
        },
      })
      await upload.done()
      console.log('done')

      // 3. Update the database record
      await prisma.mediaFile.update({
        where: { id },
        data: { fileUrl: s3Key },
      })
      console.log('  ✅ Database updated\n')

      succeeded++
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`  ❌ Failed: ${message}\n`)
      errors.push({ title, id, error: message })
      failed++
    }
  }

  // Summary
  console.log('=================================================')
  console.log(`  Migration complete`)
  console.log(`  Succeeded : ${succeeded}`)
  console.log(`  Failed    : ${failed}`)
  console.log('=================================================')

  if (errors.length > 0) {
    console.log('\nFailed files:')
    for (const e of errors) {
      console.log(`  - "${e.title}" (id: ${e.id}): ${e.error}`)
    }
    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('\nFatal error:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
