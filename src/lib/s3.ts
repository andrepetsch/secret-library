import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getS3Client(): S3Client {
  if (!process.env.S3_ENDPOINT) throw new Error('S3_ENDPOINT is not set')
  if (!process.env.S3_ACCESS_KEY_ID) throw new Error('S3_ACCESS_KEY_ID is not set')
  if (!process.env.S3_SECRET_ACCESS_KEY) throw new Error('S3_SECRET_ACCESS_KEY is not set')
  if (!process.env.S3_BUCKET_NAME) throw new Error('S3_BUCKET_NAME is not set')

  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // required for non-AWS S3-compatible storage like Strato HiDrive
  })
}

export function getS3Bucket(): string {
  if (!process.env.S3_BUCKET_NAME) throw new Error('S3_BUCKET_NAME is not set')
  return process.env.S3_BUCKET_NAME
}

// Lazy singleton — created on first use so that missing env vars don't crash at import time
let _s3Client: S3Client | null = null

export function s3(): S3Client {
  if (!_s3Client) {
    _s3Client = getS3Client()
  }
  return _s3Client
}

export async function getPresignedUploadUrl(s3Key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3')
  const command = new PutObjectCommand({
    Bucket: getS3Bucket(),
    Key: s3Key,
    ContentType: contentType,
  })
  return getSignedUrl(s3(), command, { expiresIn })
}

export async function getObjectStream(s3Key: string) {
  const command = new GetObjectCommand({
    Bucket: getS3Bucket(),
    Key: s3Key,
  })
  const response = await s3().send(command)
  return response
}

export async function deleteObject(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getS3Bucket(),
    Key: s3Key,
  })
  await s3().send(command)
}
