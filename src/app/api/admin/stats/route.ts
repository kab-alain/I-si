import { NextResponse } from 'next/server';
import { getSubscriptionStats } from '@/lib/db/subscriptions-db';

export async function GET() {
  try {
    const stats = await getSubscriptionStats();
    return NextResponse.json({ stats }, { status: 200 });
  } catch (error: any) {
    console.error('[API Admin Stats] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
