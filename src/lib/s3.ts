import { s3Client, bucketName, getS3ObjectUrl } from './config/s3-config'

/**
 * Allowed file types for upload
 */
export const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/epub+zip',
]

/**
 * Maximum file size in bytes (50MB)
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

export const MAX_FILE_SIZE_MB = 50

export { s3Client, bucketName, getS3ObjectUrl }