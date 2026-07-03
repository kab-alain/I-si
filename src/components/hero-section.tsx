"use client";

import Link from 'next/link';
import { ArrowRight, UserPlus, Sparkles, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/store/auth-store';
import { useEffect, useState } from 'react';

export function HeroSection() {
  const { user, isAuthenticated, setAuthModalOpen, setAuthModalTab } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0.0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative z-10 flex flex-col gap-4 items-center justify-center px-4 text-center"
      >
        <div className="max-w-4xl mx-auto">
          {/* Welcome greeting for authenticated users */}
          {mounted && isAuthenticated && user && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 animate-in fade-in slide-in-from-top-1">
              <Sparkles className="h-3.5 w-3.5" />
              Welcome back, {user.name}! ({user.role === 'admin' ? 'Administrator' : user.role === 'analyst' ? 'Analyst' : 'Public User'})
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Climate Risk Prediction for{' '}
            <span className="text-primary">Rwanda</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            I-si (Earth) leverages NASA POWER, CHIRPS, and Sentinel Hub data to predict and visualize
            drought, flood, and vegetation stress risks across Rwanda.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {mounted && isAuthenticated ? (
              <>
                <Button asChild size="lg" className="text-lg px-8">
                  <Link href="/map">
                    Explore Climate Risks
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                {user?.role !== 'public_user' && (
                  <Button asChild variant="outline" size="lg" className="text-lg px-8">
                    <Link href="/insights">
                      View Insights
                    </Link>
                  </Button>
                )}
              </>
            ) : (
              mounted && (
                <>
                  <Button
                    onClick={() => {
                      setAuthModalTab('signup');
                      setAuthModalOpen(true);
                    }}
                    size="lg"
                    className="text-lg px-8 gap-2"
                  >
                    <UserPlus className="h-5 w-5" />
                    Create Free Account
                  </Button>
                  <Button
                    onClick={() => {
                      setAuthModalTab('login');
                      setAuthModalOpen(true);
                    }}
                    variant="outline"
                    size="lg"
                    className="text-lg px-8 gap-2"
                  >
                    <LogIn className="h-5 w-5" />
                    Log In
                  </Button>
                </>
              )
            )}
          </div>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
