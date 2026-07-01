'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollText, RefreshCw } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/types/audit-log';
import toast from 'react-hot-toast';

export function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs?limit=50');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogs(data.logs ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionLabel = (action: string) => {
    switch (action) {
      case 'login': return 'Login';
      case 'alert_created': return 'Alert Created';
      case 'report_download': return 'Report Download';
      default: return action;
    }
  };

  const actionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-blue-100 text-blue-800';
      case 'alert_created': return 'bg-amber-100 text-amber-800';
      case 'report_download': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-indigo-500" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              Login, alert creation, and report download activity.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No audit logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left p-2 font-medium">Timestamp</th>
                  <th className="text-left p-2 font-medium">User</th>
                  <th className="text-left p-2 font-medium">Action</th>
                  <th className="text-left p-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2 text-xs">{log.user}</td>
                    <td className="p-2">
                      <Badge className={`text-xs ${actionColor(log.action)}`}>
                        {actionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
