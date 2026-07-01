import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/db/audit-logs-db';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Validate admin credentials against hardcoded values
    if (trimmedEmail === 'admin@isi.rw' && password === 'admin1234') {
      const adminUser = {
        id: 'admin',
        email: 'admin@isi.rw',
        name: 'System Administrator',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };

      await createAuditLog(trimmedEmail, 'login', 'Admin password login');

      return NextResponse.json(
        { message: 'Admin logged in successfully', user: adminUser },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid administrator email or password' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('[API Admin Login] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
