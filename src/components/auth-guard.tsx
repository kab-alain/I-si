'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShieldAlert, LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { canViewDashboard, getRoleLabel } from '@/lib/auth/permissions';
import type { UserRole } from '@/lib/types/user';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('analyst' | 'public_user' | 'admin')[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isAuthenticated, setAuthModalOpen, setAuthModalTab } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[60vh] bg-background flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // 1. Not Authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card/60 backdrop-blur-md border rounded-2xl p-8 text-center shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Authentication Required</h2>
            <p className="text-muted-foreground text-sm">
              Please log in or register to access this dashboard. Analyst and Public accounts are free to create.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => {
                setAuthModalTab('login');
                setAuthModalOpen(true);
              }}
              className="flex-1 gap-2"
            >
              <LogIn className="h-4 w-4" />
              Log In
            </Button>
            <Button
              onClick={() => {
                setAuthModalTab('signup');
                setAuthModalOpen(true);
              }}
              variant="outline"
              className="flex-1 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated but Role Restricted
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const readableRole = getRoleLabel(user.role);
    const requiredRoles = allowedRoles.map((r) => getRoleLabel(r));

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card/60 backdrop-blur-md border border-destructive/20 rounded-2xl p-8 text-center shadow-xl space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-center mb-2">
              <Badge variant="destructive" className="capitalize px-3 py-1 text-xs">
                Access Denied
              </Badge>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-destructive">Unauthorized Access</h2>
            <p className="text-muted-foreground text-sm">
              Your account role (<strong className="text-foreground">{readableRole}</strong>) does not have permission to view this page.
            </p>
            <p className="text-xs text-muted-foreground pt-2">
              This area is restricted to: <strong className="text-foreground">{requiredRoles.join(' or ')}</strong>.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            {user.role === 'public_user' && allowedRoles.some((r) => canViewDashboard(r as UserRole)) && (
              <div className="text-xs p-3 bg-muted rounded-lg text-left text-muted-foreground mb-2">
                💡 <strong>Need Analyst access?</strong> Log out and sign up for a new account selecting the <strong>Analyst</strong> role to view advanced charts.
              </div>
            )}
            <Button onClick={() => router.push('/')} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated and Authorized
  return <>{children}</>;
}
