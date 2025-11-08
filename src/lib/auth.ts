import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
// import MicrosoftEntraIDProvider from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    // UNCOMMENT THE FOLLOWING TO ENABLE MICROSOFT ENTRA ID AUTHENTICATION
    // MicrosoftEntraIDProvider({
    //   clientId: process.env.MICROSOFT_ENTRA_ID_CLIENT_ID!,
    //   clientSecret: process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET!,
    // }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user }) {
      // Check if user is already in database
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email! }
      })
      
      // If user exists, allow sign in
      if (existingUser) {
        return true
      }
      
      // For new users, validate the invitation token
      if (user.email) {
        const cookieStore = await cookies()
        const inviteToken = cookieStore.get('inviteToken')?.value
        
        if (inviteToken) {
          // Validate the specific invitation token from the cookie
          const invitation = await prisma.invitation.findUnique({
            where: {
              token: inviteToken,
            }
          })
          
          if (invitation && 
              !invitation.usedAt && 
              invitation.expiresAt >= new Date() &&
              (!invitation.email || invitation.email === user.email)) {
            // Mark invitation as used
            await prisma.invitation.update({
              where: { id: invitation.id },
              data: { usedAt: new Date() }
            })
            
            // Cookie will expire automatically after 10 minutes
            
            return true
          }
        }
        
        // Fallback: check for any available invitation (for backwards compatibility)
        // First, check for email-specific invitation
        let invitation = await prisma.invitation.findFirst({
          where: {
            email: user.email,
            expiresAt: { gte: new Date() },
            usedAt: null
          }
        })
        
        // If no email-specific invitation, check for general invitations (null email)
        if (!invitation) {
          invitation = await prisma.invitation.findFirst({
            where: {
              email: null,
              expiresAt: { gte: new Date() },
              usedAt: null
            }
          })
        }
        
        if (invitation) {
          // Mark invitation as used
          await prisma.invitation.update({
            where: { id: invitation.id },
            data: { usedAt: new Date() }
          })
          return true
        }
      }
      
      // No invitation found, deny access
      return '/auth/unauthorized'
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
