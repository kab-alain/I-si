import { NextResponse } from 'next/server';
import { getAllUsers, updateUserApprovalStatus } from '@/lib/db/users-db';
import type { ApprovalStatus } from '@/lib/types/user';

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users }, { status: 200 });
  } catch (error: unknown) {
    console.error('[API Admin Users] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId and action are required' },
        { status: 400 }
      );
    }

    let approvalStatus: ApprovalStatus;
    if (action === 'approve') {
      approvalStatus = 'approved';
    } else if (action === 'reject') {
      approvalStatus = 'rejected';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await updateUserApprovalStatus(userId, approvalStatus);
    if (!updated) {
      return NextResponse.json({ error: 'Analyst user not found' }, { status: 404 });
    }

    return NextResponse.json({ user: updated, message: `Account ${action}d successfully` });
  } catch (error: unknown) {
    console.error('[API Admin Users PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
