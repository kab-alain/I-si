/**
 * File-based alert storage (development-friendly fallback).
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { RiskAlert } from '@/lib/types/alerts';

const ALERTS_FILE = path.join(process.cwd(), 'data', 'alerts.json');

async function ensureAlertsFile(): Promise<RiskAlert[]> {
  try {
    const content = await fs.readFile(ALERTS_FILE, 'utf-8');
    return JSON.parse(content) as RiskAlert[];
  } catch {
    await fs.mkdir(path.dirname(ALERTS_FILE), { recursive: true });
    await fs.writeFile(ALERTS_FILE, '[]', 'utf-8');
    return [];
  }
}

async function writeAlerts(alerts: RiskAlert[]): Promise<void> {
  await fs.mkdir(path.dirname(ALERTS_FILE), { recursive: true });
  await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2), 'utf-8');
}

export async function getAllAlerts(): Promise<RiskAlert[]> {
  const alerts = await ensureAlertsFile();
  return alerts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveAlert(alert: RiskAlert): Promise<RiskAlert> {
  const alerts = await ensureAlertsFile();
  alerts.unshift(alert);
  // Keep last 500 alerts
  const trimmed = alerts.slice(0, 500);
  await writeAlerts(trimmed);
  return alert;
}

export async function acknowledgeAlert(alertId: string): Promise<RiskAlert | null> {
  const alerts = await ensureAlertsFile();
  const index = alerts.findIndex((a) => a.id === alertId);
  if (index === -1) return null;
  alerts[index] = { ...alerts[index], acknowledged: true };
  await writeAlerts(alerts);
  return alerts[index];
}

export async function deleteAlert(alertId: string): Promise<boolean> {
  const alerts = await ensureAlertsFile();
  const filtered = alerts.filter((a) => a.id !== alertId);
  if (filtered.length === alerts.length) return false;
  await writeAlerts(filtered);
  return true;
}
