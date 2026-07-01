import { NextResponse } from 'next/server';
import { createAuditLog, getAuditLogs } from '@/lib/db/audit-logs-db';
import type { AuditAction } from '@/lib/types/audit-log';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const logs = await getAuditLogs(limit);
    return NextResponse.json({ logs });
  } catch (error: unknown) {
    console.error('[API Audit Logs GET]', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, action, details } = await request.json();

    if (!user || !action) {
      return NextResponse.json(
        { error: 'user and action are required' },
        { status: 400 }
      );
    }

    const validActions: AuditAction[] = ['login', 'alert_created', 'report_download'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const entry = await createAuditLog(user, action, details);
    return NextResponse.json({ log: entry });
  } catch (error: unknown) {
    console.error('[API Audit Logs POST]', error);
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}
