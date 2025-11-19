# Secret Library

Eine geteilte Bibliothek für EPUB und PDF Dateien. User müssen eingeladen werden, jeder kann seine EPUBs und PDFs teilen.

A shared library for EPUB and PDF files with invitation-only access.

## Features

### Implemented (MUST)
- ✅ One shared Library
- ✅ Upload of EPUB and PDF
- ✅ Reader for EPUB and PDF
- ✅ Users can only be invited via user-specific link, which expires after X days (default: 7 days)
- ✅ No self-registration
- ✅ Edit media metadata (title, author, description, tags, media type)
- ✅ Soft delete media with 7-day recovery period
- ✅ Restore deleted media
- ✅ Automatic permanent deletion after one week
- ✅ Automatic PDF to EPUB conversion on upload
- ✅ Manual conversion of existing PDFs to EPUB

### Future Features (SHOULD)
- ✅ Tags for Topics

## Tech Stack

- **Next.js** - React framework with App Router
- **NextAuth.js** - Authentication with GitHub and Microsoft providers
- **Prisma** - Database ORM
- **Neon** - PostgreSQL database
- **Vercel Blob** - File storage for EPUBs and PDFs
- **Tailwind CSS** - Styling

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Neon PostgreSQL database
- GitHub OAuth App credentials
- Microsoft Entra ID (Azure AD) OAuth App credentials (optional)
- Vercel Blob Storage token

### Installation

1. Clone the repository:
```bash
git clone https://github.com/andrepetsch/secret-library.git
cd secret-library
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000` for development)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GITHUB_ID` and `GITHUB_SECRET`: From your GitHub OAuth App
- `MICROSOFT_ENTRA_ID_CLIENT_ID`, `MICROSOFT_ENTRA_ID_CLIENT_SECRET`, `MICROSOFT_ENTRA_ID_TENANT_ID`: From Azure AD (optional)
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob storage token
- Email configuration (optional, for sending invitation emails):
  - `EMAIL_HOST`: SMTP server host (e.g., `smtp.gmail.com`)
  - `EMAIL_PORT`: SMTP server port (e.g., `587`)
  - `EMAIL_SECURE`: Set to `true` for SSL/TLS (e.g., `false` for port 587)
  - `EMAIL_USER`: Your email address
  - `EMAIL_PASS`: Your email password or app-specific password
  - `EMAIL_FROM`: Sender email address (e.g., `Secret Library <noreply@secret-library.local>`)

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### First User Setup

Since the app requires invitations, you need to manually create the first user in the database or temporarily modify the authentication logic to allow the first user to sign up.

Alternatively, create an invitation directly in the database:
```sql
INSERT INTO "Invitation" (id, token, email, "expiresAt", "createdAt", "createdBy")
VALUES (
  'first-invite',
  'first-user-token',
  'your-email@example.com',
  NOW() + INTERVAL '7 days',
  NOW(),
  'system'
);
```

Then visit `http://localhost:3000/invite/first-user-token` and sign in.

## Usage

### For Users

1. **Sign In**: Use the invitation link provided by an existing member
2. **Browse Library**: View all uploaded books with search and filter capabilities
3. **Upload Books**: Upload EPUB or PDF files with metadata and tags
   - **PDF Auto-Conversion**: PDFs are automatically converted to EPUB format on upload
   - Both PDF and EPUB versions are available for each uploaded PDF
4. **Read Books**: Click on any book to open it in the integrated reader
5. **Navigation**: Use arrow keys (EPUB) or buttons (PDF) to navigate through books
6. **Edit Media**: Click "Edit" on your own media to update title, author, description, tags, or media type
7. **Delete Media**: Click "Delete" to soft-delete media (recoverable for 7 days)
8. **Restore Media**: Visit the "Deleted Items" page to restore deleted media within 7 days
9. **Automatic Cleanup**: Media deleted for more than 7 days will be permanently removed automatically

### For Admins

1. **Create Invitations**: Go to the Invitations page to create new invitation links
2. **Send Email Invitations**: When email configuration is set up, invitations will be automatically sent via email
3. **Schedule Cleanup**: Set up automated cleanup of deleted media using Vercel Cron or external services (see [MEDIA_CLEANUP.md](MEDIA_CLEANUP.md))
4. **Manual Sharing**: If email is not configured, copy invitation links and share them manually
5. **Manage Invitations**: View active, expired, and used invitations
6. **Convert Existing PDFs**: Use the `/api/media/convert-pdf-to-epub` endpoint to convert previously uploaded PDFs
   - Convert single PDF: `POST /api/media/convert-pdf-to-epub` with `{"mediaId": "media-id"}`
   - Convert all PDFs: `POST /api/media/convert-pdf-to-epub` with `{"all": true}`

## PDF to EPUB Conversion

The Secret Library automatically converts uploaded PDF files to EPUB format for improved reading experience on e-readers and mobile devices.

### How It Works

1. **Automatic Conversion**: When you upload a PDF file, it's automatically converted to EPUB format in the background
2. **Dual Format Storage**: Both the original PDF and the converted EPUB are stored and available
3. **Metadata Preservation**: The conversion preserves metadata like title, author, description, and publication date
4. **Format Selection**: Users can choose to read either the PDF or EPUB version of the same media item

### Converting Existing PDFs

For PDFs that were uploaded before this feature was implemented, you can convert them using the API:

```bash
# Convert a specific media item
curl -X POST https://your-domain.com/api/media/convert-pdf-to-epub \
  -H "Content-Type: application/json" \
  -d '{"mediaId": "your-media-id"}'

# Convert all PDFs that don't have EPUBs yet
curl -X POST https://your-domain.com/api/media/convert-pdf-to-epub \
  -H "Content-Type: application/json" \
  -d '{"all": true}'
```

### Limitations

- PDF text extraction capabilities are limited due to PDF format complexity
- The converted EPUB contains page markers and basic structure
- For best reading experience with complex PDFs, the original PDF format is recommended
- Images and advanced formatting may not be preserved in the conversion

## Project Structure

```
secret-library/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── media/         # Media management
│   │   │   │   └── convert-pdf-to-epub/  # PDF to EPUB conversion endpoint
│   │   │   ├── upload/        # File upload handler
│   │   │   └── invitations/   # Invitation management
│   │   ├── auth/              # Authentication pages
│   │   ├── invite/            # Invitation acceptance
│   │   ├── library/           # Main library view
│   │   ├── reader/            # Book reader
│   │   └── upload/            # Book upload
│   ├── components/
│   │   ├── EpubReader.tsx     # EPUB reader component
│   │   └── PdfReader.tsx      # PDF reader component
│   └── lib/
│       ├── auth.ts            # NextAuth configuration
│       ├── prisma.ts          # Prisma client
│       ├── metadata.ts        # Metadata extraction utilities
│       └── pdf-to-epub.ts     # PDF to EPUB conversion utilities
└── public/
```

## Database Schema

- **User**: User accounts with OAuth provider info
- **Media**: Uploaded media items (EPUB/PDF) with metadata and media type (Book, Magazine, Paper, Article)
- **Tag**: Topics/categories for media
- **Invitation**: Time-limited invitation tokens
- **Account/Session**: NextAuth.js tables

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Environment Variables in Production

Make sure to set all the environment variables from `.env.example` in your Vercel project settings.

### Email Configuration

The app supports sending invitation emails automatically. To enable this feature:

1. **Gmail Users**: 
   - Use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password
   - Set `EMAIL_HOST=smtp.gmail.com`, `EMAIL_PORT=587`, `EMAIL_SECURE=false`

2. **Other SMTP Providers**:
   - Configure the SMTP settings according to your provider's documentation
   - Common providers: SendGrid, Amazon SES, Mailgun, etc.

3. **Optional Feature**:
   - Email configuration is optional
   - Without email config, invitation links can still be copied and shared manually
   - The app will gracefully fall back to manual link sharing if email is not configured

## Security Features

- Invitation-only access
- No self-registration
- Time-limited invitation links
- Secure authentication with OAuth providers
- Session-based access control

## License

MIT

## Support

For issues or questions, please open an issue on this Repository.
