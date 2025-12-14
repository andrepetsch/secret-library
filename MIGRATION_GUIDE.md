# Migration Guide for Collections Feature

This PR adds a new `Collection` model to the database schema. To use this feature, you need to apply the schema changes to your database.

## Steps to Apply Schema Changes

1. **Install dependencies** (this regenerates the Prisma client):
   ```bash
   npm install
   ```

2. **Push the schema changes to your database**:
   ```bash
   npx prisma db push
   ```

   This will create the new `Collection` table and update the relationships.

3. **Restart your application**:
   ```bash
   npm run dev
   ```

## What's New

The schema now includes:
- A new `Collection` table for organizing media into folders
- Many-to-many relationship between `Collection` and `Media`
- Unique constraint on collection names per user

## Troubleshooting

If you see an error like "Cannot read properties of undefined (reading 'findUnique')" or "prisma.collection is undefined", it means:
- The Prisma client hasn't been regenerated. Run `npm install` to trigger the postinstall script.
- The database schema hasn't been updated. Run `npx prisma db push` to apply the changes.
