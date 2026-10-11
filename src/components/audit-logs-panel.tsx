'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollText, RefreshCw, Calendar, X } from 'lucide-react';
import type { AuditLogEntry } from '@/lib/types/audit-log';
import toast from 'react-hot-toast';

export function AuditLogsPanel() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs?limit=200');
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

  const formatDateInput = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePreset = (p: 'all' | 'today' | '7d' | '30d') => {
    const today = new Date();
    if (p === 'all') {
      setStartDate('');
      setEndDate('');
      setPreset('all');
    } else if (p === 'today') {
      const todayStr = formatDateInput(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
      setPreset('today');
    } else if (p === '7d') {
      const start = new Date();
      start.setDate(today.getDate() - 7);
      setStartDate(formatDateInput(start));
      setEndDate(formatDateInput(today));
      setPreset('7d');
    } else if (p === '30d') {
      const start = new Date();
      start.setDate(today.getDate() - 30);
      setStartDate(formatDateInput(start));
      setEndDate(formatDateInput(today));
      setPreset('30d');
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const raw = log.timestamp;
      if (!raw) return true;
      const logDate = new Date(raw);
      if (isNaN(logDate.getTime())) return true;

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`);
        if (logDate < start) return false;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`);
        if (logDate > end) return false;
      }

      return true;
    });
  }, [logs, startDate, endDate]);

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
      case 'login': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
      case 'alert_created': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
      case 'report_download': return 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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
        <div className="flex gap-2 pt-2 items-center flex-wrap">
          <Badge variant="outline">{logs.length} recorded events</Badge>
          {(startDate || endDate) && (
            <Badge variant="secondary" className="text-xs">
              {filteredLogs.length} matching filter
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-muted/40 rounded-lg border text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            <span className="font-medium text-muted-foreground mr-1">Presets:</span>
            <Button
              type="button"
              variant={preset === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePreset('all')}
              className="h-7 text-xs px-2.5 py-0"
            >
              All
            </Button>
            <Button
              type="button"
              variant={preset === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePreset('today')}
              className="h-7 text-xs px-2.5 py-0"
            >
              Today
            </Button>
            <Button
              type="button"
              variant={preset === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePreset('7d')}
              className="h-7 text-xs px-2.5 py-0"
            >
              7 Days
            </Button>
            <Button
              type="button"
              variant={preset === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePreset('30d')}
              className="h-7 text-xs px-2.5 py-0"
            >
              30 Days
            </Button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-muted-foreground">From</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="h-7 text-xs px-2 py-0 w-[125px] bg-background"
              aria-label="Start date filter"
            />
            <span className="text-muted-foreground">To</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="h-7 text-xs px-2 py-0 w-[125px] bg-background"
              aria-label="End date filter"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePreset('all')}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Clear date filter"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No audit logs yet.</p>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 space-y-3 border rounded-md">
            <p className="text-sm text-muted-foreground">No logs found matching the selected dates.</p>
            <Button variant="outline" size="sm" onClick={() => handlePreset('all')}>
              Reset Date Filter
            </Button>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10 border-b">
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left p-2 font-medium bg-card">Timestamp</th>
                  <th className="text-left p-2 font-medium bg-card">User</th>
                  <th className="text-left p-2 font-medium bg-card">Action</th>
                  <th className="text-left p-2 font-medium bg-card">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="p-2 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2 text-xs">{log.user}</td>
                    <td className="p-2">
                      <Badge className={`text-xs ${actionColor(log.action)}`}>
                        {actionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground max-w-[200px] truncate" title={log.details || undefined}>
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
