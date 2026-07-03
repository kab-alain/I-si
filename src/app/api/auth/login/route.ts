import { NextResponse } from 'next/server';
import { getUserByEmailAndRole } from '@/lib/db/users-db';
import { verifyPassword } from '@/lib/auth/password';
import { saveAuditLog } from '@/lib/audit';
import { UserRole } from '@/lib/types/user';
import { createOTP } from '@/lib/db/otps-db';
import { sendOTPEmail } from '@/lib/email/mailer';

export async function POST(request: Request) {
  try {
    const { email, role, password } = await request.json();

    if (!email || !role || !password) {
      return NextResponse.json(
        { error: 'Email, role, and password are required' },
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

    const user = await getUserByEmailAndRole(trimmedEmail, role as UserRole, true);
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email, role, or password' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email, role, or password' },
        { status: 401 }
      );
    }

    if (role === 'analyst') {
      if (user.approvalStatus === 'pending') {
        return NextResponse.json(
          { error: 'Your analyst account is pending admin approval. Please try again later.' },
          { status: 403 }
        );
      }
      if (user.approvalStatus === 'rejected') {
        return NextResponse.json(
          { error: 'Your analyst account was not approved. Contact the administrator.' },
          { status: 403 }
        );
      }
    }

    const { passwordHash: _, ...safeUser } = user;

    // For analysts and public users, require OTP verification first
    if (role === 'analyst' || role === 'public_user') {
      const otp = await createOTP(trimmedEmail, role as UserRole);
      await sendOTPEmail(trimmedEmail, otp, role);

      return NextResponse.json(
        { requiresOTP: true, message: 'Verification code sent to your email' },
        { status: 200 }
      );
    }

    await saveAuditLog('login', { user: trimmedEmail, details: `Password login as ${role}`, time: new Date().toISOString() });

    return NextResponse.json(
      { message: 'Logged in successfully', user: safeUser },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[API Auth Login] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
