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

### Future Features (SHOULD)
- ⏳ Conversion PDF to EPUB
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
4. **Read Books**: Click on any book to open it in the integrated reader
5. **Navigation**: Use arrow keys (EPUB) or buttons (PDF) to navigate through books

### For Admins

1. **Create Invitations**: Go to the Invitations page to create new invitation links
2. **Manage Invitations**: View active, expired, and used invitations
3. **Share Links**: Copy invitation links and share them with new users

## Project Structure

```
secret-library/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth endpoints
│   │   │   ├── books/         # Book management
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
│       └── prisma.ts          # Prisma client
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
