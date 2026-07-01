'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, BarChart3, Info, Home, Bot, Bell, Users, Shield, LogIn, UserPlus, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LiveLocation } from './live-location';
import { useAuthStore } from '@/lib/store/auth-store';
import { AuthModal } from './auth-modal';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

const baseNavigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Map', href: '/map', icon: Map },
  { name: 'AI Chat', href: '/ai-chat', icon: Bot },
  { name: 'Insights', href: '/insights', icon: BarChart3 },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'References', href: '/references', icon: Info },
];

export function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated, setAuthModalOpen, setAuthModalTab, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine active navigation links based on role
  const navigation = [...baseNavigation];
  if (mounted && isAuthenticated && user?.role === 'admin') {
    navigation.push({ name: 'Admin', href: '/admin', icon: Shield });
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white border-none font-bold text-xs uppercase px-2 py-0.5">Admin</Badge>;
      case 'analyst':
        return <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white border-none font-semibold text-xs capitalize px-2 py-0.5">Analyst</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground border-muted font-medium text-xs capitalize px-2 py-0.5">Public</Badge>;
    }
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">I</span>
              </div>
              <span className="font-bold text-xl">I-si</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={pathname === item.href ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'flex items-center space-x-2',
                        pathname === item.href && 'bg-primary text-primary-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="hidden lg:flex items-center">
            <LiveLocation />
          </div>
          
          <div className="flex items-center space-x-2">
            <Link href="/notifications">
              <Button
                variant={pathname === '/notifications' ? 'default' : 'outline'}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Get Alerts</span>
              </Button>
            </Link>
            <ThemeToggle />

            {/* AUTHENTICATION SESSION TRIGGER CONTROLS */}
            {mounted && isAuthenticated && user ? (
              <div className="flex items-center gap-2 border-l pl-3 ml-1">
                <div className="hidden sm:flex flex-col items-end mr-1">
                  <span className="text-xs font-semibold max-w-[120px] truncate">{user.name}</span>
                  {getRoleBadge(user.role)}
                </div>
                <Button 
                  onClick={logout}
                  variant="ghost" 
                  size="icon" 
                  title="Log Out"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              mounted && (
                <div className="flex items-center gap-1.5 border-l pl-3 ml-1">
                  <Button
                    onClick={() => {
                      setAuthModalTab('login');
                      setAuthModalOpen(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 px-2"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Log In</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setAuthModalTab('signup');
                      setAuthModalOpen(true);
                    }}
                    size="sm"
                    className="text-xs gap-1.5 px-3"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Up</span>
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
      
      {/* Global Auth Modal portal */}
      <AuthModal />
    </nav>
  );
}
