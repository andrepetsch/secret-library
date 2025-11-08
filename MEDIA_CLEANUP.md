# Media Cleanup Guide

## Overview

The Secret Library now supports soft deletion of media items with automatic permanent deletion after one week. This document explains how the cleanup process works and how to schedule it.

## How It Works

### Soft Delete
When a user deletes a media item:
1. The `deletedAt` timestamp is set to the current date/time
2. The media is hidden from the main library view
3. The media file remains in Vercel Blob storage
4. The media record remains in the database
5. The user can restore the media within one week

### Permanent Delete
After one week, media can be permanently deleted:
1. The media file is removed from Vercel Blob storage
2. The media record is removed from the database
3. This action is irreversible

## Cleanup Endpoint

The cleanup endpoint is available at: `POST /api/media/cleanup`

This endpoint:
- Requires authentication
- Finds all media with `deletedAt` older than 7 days
- Deletes the files from Vercel Blob storage
- Permanently removes the records from the database
- Returns the count of deleted items

### Manual Cleanup

You can manually trigger cleanup by making a POST request to the cleanup endpoint (requires authentication):

```bash
curl -X POST https://your-domain.com/api/media/cleanup \
  -H "Cookie: your-session-cookie"
```

## Automated Cleanup Options

Since this is a Next.js application deployed on Vercel, here are the recommended options for automated cleanup:

### Option 1: Vercel Cron Jobs (Recommended)

1. Create a file `vercel.json` in the root directory:

```json
{
  "crons": [
    {
      "path": "/api/media/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This will run the cleanup endpoint daily at 2:00 AM UTC.

2. Update the cleanup endpoint to verify the request is from Vercel Cron:

Add to `/src/app/api/media/cleanup/route.ts`:

```typescript
// Verify the request is from Vercel Cron
const authHeader = req.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

3. Add `CRON_SECRET` to your environment variables in Vercel.

### Option 2: External Cron Service

Use a service like:
- **Cron-job.org**: Free service that can call your cleanup endpoint
- **EasyCron**: Another popular cron service
- **GitHub Actions**: Schedule a workflow to call the endpoint

Example GitHub Action (`.github/workflows/cleanup.yml`):

```yaml
name: Cleanup Deleted Media
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2:00 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call Cleanup Endpoint
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/media/cleanup \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: Manual Periodic Cleanup

If you prefer manual control:
1. Create an admin page in your application
2. Add a button that calls the cleanup endpoint
3. Run it periodically (e.g., once a week)

## User Features

### Viewing Deleted Media
Users can view their deleted media at `/library/deleted`

This page shows:
- All media items the user has deleted
- Days remaining until permanent deletion
- Restore button for each item

### Restoring Media
Users can restore deleted media:
1. Go to `/library/deleted`
2. Click "Restore" on any item
3. The item will reappear in the main library

## Database Schema

The `Media` model includes:
```prisma
deletedAt   DateTime? // Soft delete timestamp
```

- `null`: Media is active
- `Date`: Media is soft-deleted (timestamp of deletion)

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/media` | GET | List active media |
| `/api/media/deleted` | GET | List user's deleted media |
| `/api/media/[id]` | PUT | Edit media |
| `/api/media/[id]` | DELETE | Soft delete media |
| `/api/media/[id]/restore` | POST | Restore deleted media |
| `/api/media/cleanup` | POST | Permanently delete old items |

## Security Considerations

1. **Authentication**: All endpoints require user authentication
2. **Authorization**: Users can only edit/delete/restore their own media
3. **Cleanup Access**: Consider restricting the cleanup endpoint to:
   - Vercel Cron (verify header)
   - Admin users only
   - Specific API key

## Best Practices

1. **Backup**: Regularly backup your database before cleanup runs
2. **Monitoring**: Log cleanup operations to track deleted items
3. **User Notification**: Consider notifying users before permanent deletion
4. **Grace Period**: The 7-day period gives users time to recover mistakes

## Troubleshooting

### Cleanup Not Running
- Check Vercel Cron is configured correctly
- Verify `CRON_SECRET` environment variable is set
- Check Vercel logs for errors

### Files Not Deleted from Blob Storage
- Verify `BLOB_READ_WRITE_TOKEN` has delete permissions
- Check network connectivity to Vercel Blob
- Review error logs in the cleanup endpoint

### Users Can't Restore Media
- Verify the media was deleted less than 7 days ago
- Check user owns the media
- Ensure database connection is working
