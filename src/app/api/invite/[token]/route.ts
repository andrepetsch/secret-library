import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    })

    if (!invitation) {
      return NextResponse.redirect(new URL('/invite/' + token, req.url))
    }

    if (invitation.usedAt) {
      return NextResponse.redirect(new URL('/invite/' + token, req.url))
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return NextResponse.redirect(new URL('/invite/' + token, req.url))
    }

    // Store the invitation token in a cookie for the auth callback to validate
    const cookieStore = await cookies()
    cookieStore.set('inviteToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    })

    // Valid invitation - redirect to sign in
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  } catch (error) {
    console.error('Error processing invitation:', error)
    return NextResponse.redirect(new URL('/invite/' + token, req.url))
  }
}
