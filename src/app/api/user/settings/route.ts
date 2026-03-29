import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        kindleEmail: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json({ error: 'Failed to fetch user settings' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, kindleEmail } = body

    // Validate kindle email format if provided
    if (kindleEmail !== undefined && kindleEmail !== '' && kindleEmail !== null) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(kindleEmail)) {
        return NextResponse.json({ error: 'Invalid Kindle email address' }, { status: 400 })
      }
    }

    const updateData: { name?: string; kindleEmail?: string | null } = {}

    if (name !== undefined) {
      updateData.name = name || null
    }

    if (kindleEmail !== undefined) {
      updateData.kindleEmail = kindleEmail || null
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        kindleEmail: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json({ error: 'Failed to update user settings' }, { status: 500 })
  }
}
