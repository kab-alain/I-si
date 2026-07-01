'use client';

import { useEffect, useState } from 'react';
import { Navigation } from '@/components/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BellRing, CalendarDays, ShieldCheck, RefreshCw, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertsManagementPanel } from '@/components/alerts-management-panel';
import { AuditLogsPanel } from '@/components/audit-logs-panel';
import toast from 'react-hot-toast';

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'analyst' | 'public_user' | 'admin';
  createdAt: string;
  organization?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

interface SubscriptionStats {
  total: number;
  active: number;
  inactive: number;
  byFrequency: {
    immediate: number;
    daily: number;
    weekly: number;
  };
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // Fetch users
      const usersRes = await fetch('/api/admin/users');
      const usersData = await usersRes.json();
      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to fetch users');

      // Fetch stats
      const statsRes = await fetch('/api/admin/stats');
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.error || 'Failed to fetch subscription stats');

      setUsers(usersData.users);
      setStats(statsData.stats);
      
      if (silent) toast.success('Dashboard data refreshed!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error loading dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold">Admin</Badge>;
      case 'analyst':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold">Analyst</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Public User</Badge>;
    }
  };

  const getApprovalBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500 text-white">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'approved':
      default:
        return <Badge variant="outline" className="text-green-600 border-green-300">Approved</Badge>;
    }
  };

  const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      toast.success(data.message);
      fetchDashboardData(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update account');
    }
  };

  const pendingAnalysts = users.filter((u) => u.role === 'analyst' && u.approvalStatus === 'pending');

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <AuthGuard allowedRoles={['admin']}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground text-sm">
                System administration panel: monitor user accounts and email subscription alerts.
              </p>
            </div>
            
            <Button
              onClick={() => fetchDashboardData(true)}
              variant="outline"
              disabled={refreshing || loading}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Metrics
            </Button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-10 bg-muted/50 pb-2"></CardHeader>
                  <CardContent className="h-20 bg-muted/30 pt-0"></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* System Stats Cards */
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Registered Accounts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length + 1}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {users.filter(u => u.role === 'analyst').length} Analysts / {users.filter(u => u.role === 'public_user').length} Public / 1 Admin
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Alert Subscribers</CardTitle>
                  <BellRing className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.active || 0} verified active / {stats?.inactive || 0} pending
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Immediate Alerts</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.byFrequency.immediate || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dispatched immediately upon anomaly detection
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Digests (Daily/Weekly)</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats?.byFrequency.daily || 0) + (stats?.byFrequency.weekly || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.byFrequency.daily || 0} daily digests / {stats?.byFrequency.weekly || 0} weekly digests
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Directory and Subscriptions Panel */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* User Accounts Directory */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-500" />
                  User Accounts Directory
                </CardTitle>
                <CardDescription>
                  Manage registered accounts and approve pending analyst registrations.
                </CardDescription>
                {pendingAnalysts.length > 0 && (
                  <Badge className="mt-2 bg-amber-500 text-white">
                    {pendingAnalysts.length} analyst{pendingAnalysts.length > 1 ? 's' : ''} awaiting approval
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    <div className="h-6 bg-muted rounded w-full animate-pulse"></div>
                    <div className="h-6 bg-muted rounded w-full animate-pulse"></div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No registered accounts yet</p>
                    <p className="text-xs">User registration details will populate here once accounts are created.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-t">
                      <thead className="bg-muted/30 text-muted-foreground uppercase text-xs">
                        <tr>
                          <th className="p-4 font-semibold">User Name</th>
                          <th className="p-4 font-semibold">Email</th>
                          <th className="p-4 font-semibold">Role</th>
                          <th className="p-4 font-semibold">Organization</th>
                          <th className="p-4 font-semibold">Status</th>
                          <th className="p-4 font-semibold">Registered At</th>
                          <th className="p-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Render hardcoded Admin as first item for completeness */}
                        <tr className="border-b bg-primary/5 hover:bg-primary/10 transition-colors">
                          <td className="p-4 font-medium flex items-center gap-1.5">
                            System Administrator
                          </td>
                          <td className="p-4">admin@isi.rw</td>
                          <td className="p-4">{getRoleBadge('admin')}</td>
                          <td className="p-4 text-xs text-muted-foreground">—</td>
                          <td className="p-4">{getApprovalBadge('approved')}</td>
                          <td className="p-4 text-xs text-muted-foreground">Hardcoded Core</td>
                          <td className="p-4">—</td>
                        </tr>
                        
                        {users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-muted/40 transition-colors">
                            <td className="p-4 font-medium">{user.name}</td>
                            <td className="p-4 text-muted-foreground">{user.email}</td>
                            <td className="p-4">{getRoleBadge(user.role)}</td>
                            <td className="p-4 text-xs text-muted-foreground">{user.organization || '—'}</td>
                            <td className="p-4">{getApprovalBadge(user.approvalStatus)}</td>
                            <td className="p-4 text-xs text-muted-foreground">{formatDate(user.createdAt)}</td>
                            <td className="p-4">
                              {user.role === 'analyst' && user.approvalStatus === 'pending' ? (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleApproval(user.id, 'approve')}>
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleApproval(user.id, 'reject')}>
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Management Info */}
            <Card className="lg:col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                  Outreach Support
                </CardTitle>
                <CardDescription>
                  Administrative details & subscription controls.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">PostgreSQL Databases</h3>
                  <p className="text-xs text-muted-foreground">
                    All Analyst and Public users are registered inside the PostgreSQL database table <code>users</code>. Verified logins and active OTP credentials are dynamically cleaned from <code>otps</code> table on execution.
                  </p>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <h3 className="text-sm font-semibold">Email Service Health</h3>
                  <div className="p-3 bg-muted/60 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-medium">Nodemailer (Gmail):</span>
                    <Badge variant="outline" className="text-indigo-500 border-indigo-200 bg-indigo-50/50">
                      Active Fallback
                    </Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground leading-relaxed">
                    If credentials are set in <code>.env.local</code>, real emails are dispatched. Otherwise, mock logs print to standard stdout on the server terminal.
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl border border-dashed flex flex-col items-center justify-center text-center space-y-1 pt-6">
                  <ShieldCheck className="h-8 w-8 text-primary/70 mb-1" />
                  <p className="text-xs font-semibold">System Environment</p>
                  <p className="text-2xs text-muted-foreground">
                    Next.js API Routes / App Router 15.5
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Early Warning Alerts & Audit Logs */}
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <AlertsManagementPanel />
            <AuditLogsPanel />
          </div>
        </div>
      </AuthGuard>
    </div>
  );
}
