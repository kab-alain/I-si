/**
 * PostgreSQL-based audit log storage (replaces file-based storage).
 */

import db from '@/lib/db';
import type { AuditAction, AuditLogEntry } from '@/lib/types/audit-log';

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function createAuditLog(
  user: string,
  action: AuditAction,
  details?: string
): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    user,
    action,
    details,
  };
  await db.query(
    "INSERT INTO audit_logs (action, data) VALUES ($1, $2)",
    [action, JSON.stringify(entry)]
  );
  return entry;
}

export async function getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const result = await db.query(
    "SELECT data FROM audit_logs ORDER BY id DESC LIMIT $1",
    [limit]
  );
  return result.rows.map((row: { data: AuditLogEntry | string }) => {
    if (typeof row.data === 'string') {
      return JSON.parse(row.data) as AuditLogEntry;
    }
    return row.data as AuditLogEntry;
  });
}
