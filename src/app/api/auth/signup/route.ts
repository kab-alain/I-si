import { NextResponse } from 'next/server';
import { createUser, getUserByEmailAndRole } from '@/lib/db/users-db';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { UserRole } from '@/lib/types/user';

export async function POST(request: Request) {
  try {
    const { email, name, role, password, organization } = await request.json();

    if (!email || !name || !role || !password) {
      return NextResponse.json(
        { error: 'Email, name, password, and role are required fields' },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();

    if (role !== 'analyst' && role !== 'public_user') {
      return NextResponse.json(
        { error: 'Invalid signup role. Must be analyst or public_user' },
        { status: 400 }
      );
    }

    if (role === 'analyst' && !organization?.trim()) {
      return NextResponse.json(
        { error: 'Organization is required for analyst registration' },
        { status: 400 }
      );
    }

    const existingUser = await getUserByEmailAndRole(trimmedEmail, role as UserRole);
    if (existingUser) {
      return NextResponse.json(
        { error: `An account with this email already exists as a ${role === 'analyst' ? 'Analyst' : 'Public User'}` },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const newUser = await createUser(trimmedEmail, name, role as UserRole, passwordHash, {
      organization: role === 'analyst' ? organization.trim() : undefined,
    });

    const message =
      role === 'analyst'
        ? 'Analyst account submitted. Please wait for admin approval before logging in.'
        : 'Account created successfully! Please log in.';

    return NextResponse.json(
      { message, user: newUser, requiresApproval: role === 'analyst' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[API Auth Signup] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
