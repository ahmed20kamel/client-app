'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f9fafb',
          padding: '1.5rem',
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: '#fff',
            borderRadius: '1rem',
            border: '1px solid #e5e7eb',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{ background: '#fef2f2', borderRadius: '9999px', padding: '1rem' }}>
                <AlertTriangle size={40} color="#ef4444" />
              </div>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
              Application Error
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem', lineHeight: '1.5' }}>
              {error.message || 'A critical error occurred. Please refresh the page.'}
            </p>
            {error.digest && (
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace', marginBottom: '1.25rem' }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: '#111827', color: '#fff', border: 'none',
                borderRadius: '0.5rem', padding: '0.625rem 1.25rem',
                fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
              }}
            >
              <RefreshCw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
