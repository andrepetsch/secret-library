import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import MicrosoftEntraIDProvider from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    MicrosoftEntraIDProvider({
      clientId: process.env.MICROSOFT_ENTRA_ID_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET!,
    }),
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
      
      // If no existing user, check for valid invitation
      if (user.email) {
        const invitation = await prisma.invitation.findFirst({
          where: {
            email: user.email,
            expiresAt: { gte: new Date() },
            usedAt: null
          }
        })
        
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
