import { NextResponse } from 'next/server';
import { getUserByEmailAndRole } from '@/lib/db/users-db';
import { verifyOTP } from '@/lib/db/otps-db';
import { UserRole } from '@/lib/types/user';

export async function POST(request: Request) {
  try {
    const { email, role, otp } = await request.json();

    if (!email || !role || !otp) {
      return NextResponse.json(
        { error: 'Email, role, and verification code are required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();
    const cleanOTP = otp.trim();

    if (role !== 'analyst' && role !== 'public_user') {
      return NextResponse.json(
        { error: 'Invalid authentication role' },
        { status: 400 }
      );
    }

    // Verify OTP
    const isValid = await verifyOTP(trimmedEmail, role as UserRole, cleanOTP);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await getUserByEmailAndRole(trimmedEmail, role as UserRole);
    if (!user) {
      return NextResponse.json(
        { error: 'User details could not be found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Logged in successfully', user },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Verify OTP] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
