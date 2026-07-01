'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Droplets, RefreshCw, Check, Trash2 } from 'lucide-react';
import type { RiskAlert } from '@/lib/types/alerts';
import toast from 'react-hot-toast';

export function AlertsManagementPanel() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAlerts(data.alerts ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', alertId, user: 'admin' }),
      });
      if (!res.ok) throw new Error('Failed to acknowledge');
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
      );
      toast.success('Alert acknowledged');
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', alertId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success('Alert removed');
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const activeCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Early Warning Alerts
            </CardTitle>
            <CardDescription>
              Manage flood and drought risk alerts generated when thresholds are exceeded.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="flex gap-2 pt-2">
          <Badge variant="destructive">{activeCount} active</Badge>
          <Badge variant="outline">{alerts.length} total</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No alerts recorded yet. Alerts are generated when flood risk exceeds 80% or drought risk exceeds 75%.
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                  alert.acknowledged ? 'opacity-60 bg-muted/30' : 'bg-background'
                }`}
              >
                {alert.type === 'flood' ? (
                  <Droplets className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium capitalize">{alert.type} — {alert.score}%</span>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'} className="text-xs">
                      {alert.severity}
                    </Badge>
                    {alert.acknowledged && (
                      <Badge variant="outline" className="text-xs">Acknowledged</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!alert.acknowledged && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAcknowledge(alert.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(alert.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
