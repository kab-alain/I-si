import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db/users-db';

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users }, { status: 200 });
  } catch (error: any) {
    console.error('[API Admin Users] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
