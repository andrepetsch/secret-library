import nodemailer from 'nodemailer'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
}

export interface SendInvitationEmailParams {
  to: string
  inviteLink: string
  expiresAt: Date
}

/**
 * Creates an email transporter based on environment configuration
 */
function createTransporter() {
  const config: EmailConfig = {
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
    from: process.env.EMAIL_FROM || 'noreply@secret-library.local',
  }

  // Validate required configuration
  if (!config.host || !config.auth.user || !config.auth.pass) {
    throw new Error('Email configuration is incomplete. Please check environment variables.')
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })
}

/**
 * Sends an invitation email to a new user
 */
export async function sendInvitationEmail({
  to,
  inviteLink,
  expiresAt,
}: SendInvitationEmailParams): Promise<void> {
  try {
    const transporter = createTransporter()
    const from = process.env.EMAIL_FROM || 'noreply@secret-library.local'

    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const mailOptions = {
      from,
      to,
      subject: 'You are invited to Secret Library',
      text: `Hello,

You have been invited to join Secret Library - a shared library for EPUB and PDF files.

Click the link below to accept your invitation:
${inviteLink}

This invitation will expire on ${expiryDate}.

If you did not expect this invitation, you can safely ignore this email.

Best regards,
Secret Library Team`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Secret Library</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">Welcome to Secret Library</h1>
    <p style="font-size: 16px; margin-bottom: 20px;">You have been invited to join Secret Library - a shared library for EPUB and PDF files.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
    </div>
    
    <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
    <p style="font-size: 14px; background-color: white; padding: 10px; border-radius: 4px; word-break: break-all; border: 1px solid #ddd;">${inviteLink}</p>
    
    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      <strong>Note:</strong> This invitation will expire on <strong>${expiryDate}</strong>.
    </p>
  </div>
  
  <p style="font-size: 12px; color: #999; text-align: center;">
    If you did not expect this invitation, you can safely ignore this email.
  </p>
</body>
</html>`,
    }

    await transporter.sendMail(mailOptions)
    console.log(`Invitation email sent to ${to}`)
  } catch (error) {
    console.error('Error sending invitation email:', error)
    throw new Error('Failed to send invitation email')
  }
}

/**
 * Validates email configuration
 */
export function validateEmailConfig(): boolean {
  return !!(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
  )
}
