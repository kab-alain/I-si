import { NextResponse } from 'next/server';
import { getUserByEmailAndRole } from '@/lib/db/users-db';
import { createOTP } from '@/lib/db/otps-db';
import { sendOTPEmail } from '@/lib/email/mailer';
import { UserRole } from '@/lib/types/user';

export async function POST(request: Request) {
  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();

    if (role !== 'analyst' && role !== 'public_user') {
      return NextResponse.json(
        { error: 'Invalid authentication role' },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await getUserByEmailAndRole(trimmedEmail, role as UserRole);
    if (!user) {
      return NextResponse.json(
        { error: `No registered account found with this email for the role of ${role === 'analyst' ? 'Analyst' : 'Public User'}. Please sign up first.` },
        { status: 404 }
      );
    }

    // Generate OTP in database
    const otp = await createOTP(trimmedEmail, role as UserRole);

    // Send OTP email (or fallback to console print)
    await sendOTPEmail(trimmedEmail, otp, role);

    return NextResponse.json(
      { message: 'Verification code sent successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Send OTP] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
