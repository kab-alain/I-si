'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound, Mail, User as UserIcon, Shield, CheckCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalTab,
    setAuthModalOpen,
    setAuthModalTab,
    login,
  } = useAuthStore();

  // Common States
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'analyst' | 'public_user' | 'admin'>('public_user');
  const [email, setEmail] = useState('');
  
  // Login States
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Signup States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState<'analyst' | 'public_user'>('public_user');

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Reset states when modal is closed
  useEffect(() => {
    if (!isAuthModalOpen) {
      setLoading(false);
      setOtpSent(false);
      setOtp('');
      setPassword('');
    }
  }, [isAuthModalOpen]);

  // Handler for Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupRole) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName,
          email: signupEmail,
          role: signupRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      toast.success('Account created successfully! Please log in.');
      
      // Auto transition to login tab
      setEmail(signupEmail);
      setRole(signupRole);
      setAuthModalTab('login');
      
      // Clear signup fields
      setSignupName('');
      setSignupEmail('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler for Requesting OTP
  const handleRequestOTP = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');

      setOtpSent(true);
      setCooldown(60);
      toast.success('Verification code sent to your email!');
      console.log('OTP sent. Check the terminal console if you are in local development.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler for Verifying OTP (Login)
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) {
      toast.error('Please enter your email and verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      login(data.user);
      setAuthModalOpen(false);
      toast.success(`Welcome back, ${data.user.name}!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler for Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin login failed');

      login(data.user);
      setAuthModalOpen(false);
      toast.success('Administrator session active');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={setAuthModalOpen}>
      <DialogContent className="sm:max-w-[420px] bg-card/95 backdrop-blur-md border shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold text-center">
            Rwanda Climate Risk
          </DialogTitle>
          <DialogDescription className="text-center">
            Sign in to access maps, chat, alerts, and analytics.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={authModalTab} onValueChange={(v) => {
          setAuthModalTab(v as 'login' | 'signup');
          setOtpSent(false);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="login">Log In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          {/* LOGIN TAB CONTENT */}
          <TabsContent value="login">
            <form onSubmit={role === 'admin' ? handleAdminLogin : handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-role">Select Role</Label>
                <select
                  id="login-role"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as any);
                    setOtpSent(false);
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="public_user">Public User (OTP Verification)</option>
                  <option value="analyst">Analyst (OTP Verification)</option>
                  <option value="admin">Administrator (Password Login)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={role === 'admin' ? 'admin@isi.rw' : 'name@example.com'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || otpSent}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              {/* ADMIN PASSWORD INPUT */}
              {role === 'admin' ? (
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      className="pl-9"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground bg-primary/5 p-2 rounded border border-primary/10">
                    ℹ️ <strong>Demo credentials:</strong> email: <code className="font-semibold text-foreground">admin@isi.rw</code> / password: <code className="font-semibold text-foreground">admin1234</code>
                  </p>
                </div>
              ) : (
                /* ANALYST/PUBLIC USER OTP VERIFICATION INPUT */
                otpSent && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="login-otp">Verification Code</Label>
                      <button
                        type="button"
                        onClick={handleRequestOTP}
                        disabled={cooldown > 0 || loading}
                        className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                      >
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-otp"
                        type="text"
                        placeholder="123456"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        disabled={loading}
                        className="pl-9 tracking-widest font-bold text-center text-lg"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Check your email inbox. If you are developing locally, the code is printed in the server terminal logs.
                    </p>
                  </div>
                )
              )}

              {/* ACTION BUTTONS */}
              {role === 'admin' ? (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loggin in...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" /> Log In as Admin
                    </>
                  )}
                </Button>
              ) : otpSent ? (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> Verify & Log In
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleRequestOTP}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting...
                    </>
                  ) : (
                    <>
                      Send Verification Code <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </form>
          </TabsContent>

          {/* SIGNUP TAB CONTENT */}
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    placeholder="Jane Doe"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    disabled={loading}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={loading}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-role">Select Role</Label>
                <select
                  id="signup-role"
                  value={signupRole}
                  onChange={(e) => setSignupRole(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="public_user">Public User (Access to Maps & Community)</option>
                  <option value="analyst">Analyst (Access to Maps, Chat & Advanced Insights)</option>
                </select>
              </div>

              <Button type="submit" className="w-full mt-4" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>
                    Register & Create Account
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
