import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { sendInvitationEmail, validateEmailConfig } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email, expiresInDays = 7 } = await req.json()

    // Check if user already exists (only if email is provided)
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 })
      }
    }

    // Create invitation
    const token = nanoid(32)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const invitation = await prisma.invitation.create({
      data: {
        token,
        email,
        expiresAt,
        createdBy: session.user.id,
      }
    })

    const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${token}`

    // Send invitation email if email is provided and email config is valid
    if (email && validateEmailConfig()) {
      try {
        await sendInvitationEmail({
          to: email,
          inviteLink,
          expiresAt,
        })
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError)
        // Continue even if email fails - user can still get the link manually
      }
    }

    return NextResponse.json({ 
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
      inviteLink 
    })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        createdBy: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }
}
