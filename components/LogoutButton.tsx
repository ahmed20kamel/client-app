'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function LogoutButton({ locale }: { locale: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push(`/${locale}/login`);
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
      title="Logout"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
