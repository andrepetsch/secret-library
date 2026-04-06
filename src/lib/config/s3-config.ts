// Configure AWS SDK for Strato HiDrive S3-compatible API
import { S3Client } from '@aws-sdk/client-s3'

// Set AWS region in environment for SDK compatibility
process.env.AWS_REGION = 'us-east-1' // Default region required by SDK

// Create and configure S3 client for Strato HiDrive
export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: 'us-east-1', // Required by AWS SDK but ignored by Strato
  forcePathStyle: true, // Required for S3-compatible services
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
})

export const bucketName = process.env.S3_BUCKET_NAME!

export const getS3ObjectUrl = (key: string): string => {
  return `${process.env.S3_ENDPOINT}/${bucketName}/${key}`
}