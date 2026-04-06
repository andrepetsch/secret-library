import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3Client, bucketName, ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE_BYTES } from './s3'
import { nanoid } from 'nanoid'

/**
 * Allows uploading Node.js Buffer or string data
 */
type UploadData = Buffer | string | Uint8Array

/**
 * Upload a file to S3 storage
 * @param file - The file to upload (Browser File object)
 * @param metadata - Additional metadata to include in filename/path
 * @returns Object containing the S3 object URL
 */
export const uploadFileToS3 = async (
  file: File,
  metadata: Record<string, string> = {}
): Promise<{ url: string; key: string }> => {
  // Validate file type
  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed. Only PDF and EPUB are supported.`)
  }

  // Validate file size (<= 50MB enforced here)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds the maximum limit of 50MB`)
  }

  try {
    // Generate a unique filename with metadata
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const uniqueId = nanoid()
    
    // Create a clean filename from metadata
    const metadataString = Object.entries(metadata)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}-${value.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`)
      .join('-')
    
    const fileKey = `uploads/${uniqueId}${metadataString ? '-' + metadataString : ''}.${fileExt}`

    // Create a Buffer from the File object
    // In browser File has arrayBuffer() method
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Upload to S3
    const uploadParams = {
      Bucket: bucketName,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: file.type,
      Metadata: {
        'original-filename': file.name,
        'uploaded-by': metadata.userId || 'unknown',
      },
    }

    const command = new PutObjectCommand(uploadParams)
    await s3Client.send(command)

    // Generate the public URL for the uploaded file
    const objectUrl = `${process.env.S3_ENDPOINT}/${bucketName}/${fileKey}`

    return {
      url: objectUrl,
      key: fileKey,
    }
  } catch (error) {
    console.error('Error uploading to S3:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to upload file to S3: ${error.message}`)
    }
    throw new Error('Failed to upload file to S3')
  }
}

/**
 * Validate file size before upload attempt
 */
export const validateFileSize = (file: File): boolean => {
  return file.size <= MAX_FILE_SIZE_BYTES
}

/**
 * Validate file type
 */
export const validateFileType = (file: File): boolean => {
  return ALLOWED_CONTENT_TYPES.includes(file.type)
}
