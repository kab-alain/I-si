/**
 * Audit Log Types
 */

export type AuditAction = 'login' | 'alert_created' | 'report_download';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  details?: string;
}
