import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function InvitePage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const { token } = await params
  
  const invitation = await prisma.invitation.findUnique({
    where: { token }
  })

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Invalid Invitation
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            This invitation link is not valid.
          </p>
        </div>
      </div>
    )
  }

  if (invitation.usedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Invitation Already Used
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            This invitation has already been used.
          </p>
          <div className="text-center">
            <Link 
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (new Date(invitation.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
            Invitation Expired
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400">
            This invitation has expired. Please request a new invitation.
          </p>
        </div>
      </div>
    )
  }

  // Valid invitation - redirect to sign in
  redirect('/auth/signin')
}
