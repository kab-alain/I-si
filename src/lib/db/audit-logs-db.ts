/**
 * File-based audit log storage (development-friendly fallback).
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { AuditAction, AuditLogEntry } from '@/lib/types/audit-log';

const LOGS_FILE = path.join(process.cwd(), 'data', 'audit-logs.json');

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function ensureLogsFile(): Promise<AuditLogEntry[]> {
  try {
    const content = await fs.readFile(LOGS_FILE, 'utf-8');
    return JSON.parse(content) as AuditLogEntry[];
  } catch {
    await fs.mkdir(path.dirname(LOGS_FILE), { recursive: true });
    await fs.writeFile(LOGS_FILE, '[]', 'utf-8');
    return [];
  }
}

async function writeLogs(logs: AuditLogEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(LOGS_FILE), { recursive: true });
  await fs.writeFile(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

export async function createAuditLog(
  user: string,
  action: AuditAction,
  details?: string
): Promise<AuditLogEntry> {
  const logs = await ensureLogsFile();
  const entry: AuditLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    user,
    action,
    details,
  };
  logs.unshift(entry);
  const trimmed = logs.slice(0, 1000);
  await writeLogs(trimmed);
  return entry;
}

export async function getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const logs = await ensureLogsFile();
  return logs.slice(0, limit);
}
