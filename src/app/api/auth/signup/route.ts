import { NextResponse } from 'next/server';
import { createUser, getUserByEmailAndRole } from '@/lib/db/users-db';
import { UserRole } from '@/lib/types/user';

export async function POST(request: Request) {
  try {
    const { email, name, role } = await request.json();

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Email, name, and role are required fields' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Check if role is allowed (admin cannot be signed up through public API)
    if (role !== 'analyst' && role !== 'public_user') {
      return NextResponse.json(
        { error: 'Invalid signup role. Must be analyst or public_user' },
        { status: 400 }
      );
    }

    // Check if user already exists with this role
    const existingUser = await getUserByEmailAndRole(trimmedEmail, role as UserRole);
    if (existingUser) {
      return NextResponse.json(
        { error: `An account with this email already exists as a ${role === 'analyst' ? 'Analyst' : 'Public User'}` },
        { status: 400 }
      );
    }

    // Create user
    const newUser = await createUser(trimmedEmail, name, role as UserRole);

    return NextResponse.json(
      { message: 'User registered successfully', user: newUser },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API Auth Signup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
