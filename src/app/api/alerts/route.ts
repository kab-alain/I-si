import { NextResponse } from 'next/server';
import { getAllAlerts, saveAlert, acknowledgeAlert, deleteAlert } from '@/lib/db/alerts-db';
import { evaluateRiskAlerts } from '@/lib/alerts/alert-engine';
import { createAuditLog } from '@/lib/db/audit-logs-db';
import { sendRiskAlertEmail } from '@/lib/email/mailer';
import type { AlertEvaluationInput } from '@/lib/types/alerts';

export async function GET() {
  try {
    const alerts = await getAllAlerts();
    return NextResponse.json({ alerts });
  } catch (error: unknown) {
    console.error('[API Alerts GET]', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'acknowledge') {
      const { alertId, user } = body;
      if (!alertId) {
        return NextResponse.json({ error: 'alertId required' }, { status: 400 });
      }
      const updated = await acknowledgeAlert(alertId);
      if (!updated) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      return NextResponse.json({ alert: updated });
    }

    if (action === 'delete') {
      const { alertId } = body;
      if (!alertId) {
        return NextResponse.json({ error: 'alertId required' }, { status: 400 });
      }
      const deleted = await deleteAlert(alertId);
      if (!deleted) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    // Evaluate and create alerts from risk scores
    const input = body as AlertEvaluationInput & { user?: string };
    if (
      input.lat === undefined ||
      input.lon === undefined ||
      input.floodScore === undefined ||
      input.droughtScore === undefined
    ) {
      return NextResponse.json(
        { error: 'lat, lon, floodScore, and droughtScore are required' },
        { status: 400 }
      );
    }

    const newAlerts = evaluateRiskAlerts(input);
    const savedAlerts = [];

    for (const alert of newAlerts) {
      const saved = await saveAlert(alert);
      savedAlerts.push(saved);

      await createAuditLog(
        input.user || input.userEmail || 'system',
        'alert_created',
        `${alert.type} alert: score ${alert.score}% at ${alert.location.lat}, ${alert.location.lon}`
      );

      // Optionally send email if configured and user email provided
      if (input.userEmail) {
        await sendRiskAlertEmail(input.userEmail, alert).catch((err) => {
          console.warn('[Alerts] Email notification failed:', err);
        });
      }
    }

    return NextResponse.json({ alerts: savedAlerts, created: savedAlerts.length });
  } catch (error: unknown) {
    console.error('[API Alerts POST]', error);
    return NextResponse.json({ error: 'Failed to process alert' }, { status: 500 });
  }
}
