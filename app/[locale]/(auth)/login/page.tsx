'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, Mail, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(t('auth.tooManyRequests'));
        } else {
          toast.error(result.error || t('auth.invalidCredentials'));
        }
        return;
      }

      toast.success(t('auth.login_success'));
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-primary/70">
        <div className="absolute inset-0 bg-[url('/login-bg.jpg')] bg-cover bg-center mix-blend-overlay opacity-20" />
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-8">
            <Image src="/logo.svg" alt="Logo" width={60} height={60} />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('auth.hero_title')}</h1>
          <p className="text-xl text-white/80">{t('auth.hero_subtitle')}</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Image src="/logo.svg" alt="Logo" width={40} height={40} />
            <h1 className="text-xl font-bold">CRM Pro</h1>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-bold text-foreground">{t('auth.login')}</h2>
            <p className="text-muted-foreground">{t('auth.login_subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  className="ps-10"
                  placeholder="name@company.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-xs text-primary hover:underline"
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="ps-10"
                  placeholder="••••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all btn-premium"
              disabled={isLoading}
            >
              {isLoading ? (
                t('common.loading')
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {t('auth.signIn')}
                </span>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
