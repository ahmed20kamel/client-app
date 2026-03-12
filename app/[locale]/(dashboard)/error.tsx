'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff, Lock, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

function getErrorInfo(error: Error): { icon: React.ReactNode; title: string; description: string } {
  const msg = error.message?.toLowerCase() || '';

  if (msg.includes('unauthorized') || msg.includes('401')) {
    return {
      icon: <Lock className="size-10 text-warning" />,
      title: 'Session Expired',
      description: 'Your session has expired. Please log in again.',
    };
  }
  if (msg.includes('forbidden') || msg.includes('403')) {
    return {
      icon: <Lock className="size-10 text-destructive" />,
      title: 'Access Denied',
      description: 'You do not have permission to view this page.',
    };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('connect')) {
    return {
      icon: <WifiOff className="size-10 text-muted-foreground" />,
      title: 'Connection Error',
      description: 'Unable to connect. Please check your internet connection.',
    };
  }

  return {
    icon: <ServerCrash className="size-10 text-destructive" />,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Our team has been notified.',
  };
}

export default function DashboardError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  const { icon, title, description } = getErrorInfo(error);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-muted">
              {icon}
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>
            {error.digest && (
              <p className="text-xs text-muted-foreground/60 mt-3 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={reset}>
              <RefreshCw className="size-4 me-2" />
              Try Again
            </Button>
            <Button onClick={() => window.location.href = '/'}>
              <Home className="size-4 me-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
