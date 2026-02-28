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
import { LogIn, Mail, Lock, Loader2, Building2, Users, BarChart3, Globe } from 'lucide-react';

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
  const isRtl = locale === 'ar';
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
    <div className="min-h-screen flex" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hero Side */}
      <div className="hidden lg:flex lg:w-[60%] relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="/login-bg.jpg"
          alt="CRM Pro"
          fill
          className="object-cover"
          priority
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/90" />

        {/* Decorative Elements */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2" />
        <div className="absolute bottom-0 start-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3 rtl:translate-x-1/3" />
        <div className="absolute top-1/2 start-1/4 w-48 h-48 bg-white/3 rounded-full" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Top - Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Image src="/logo.svg" alt="Logo" width={28} height={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold">CRM Pro</h2>
              <p className="text-xs text-white/60">Enterprise Edition</p>
            </div>
          </div>

          {/* Center - Hero Text */}
          <div className="space-y-6">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              {t('auth.hero_title')}
            </h1>
            <p className="text-lg text-white/70 max-w-md">
              {t('auth.hero_subtitle')}
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3 pt-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <Users className="size-4" />
                <span>{t('navigation.customers')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <Building2 className="size-4" />
                <span>{t('navigation.departments')}</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm">
                <BarChart3 className="size-4" />
                <span>{t('navigation.reports')}</span>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <p className="text-sm text-white/40">
            &copy; 2026 CRM Pro. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-6 sm:px-12 lg:px-16 bg-background relative">
        {/* Language Switcher - Top */}
        <div className="absolute top-6 end-6 flex gap-1">
          <Link
            href={`/en/login`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
              locale === 'en'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            <Globe className="size-3" />
            EN
          </Link>
          <Link
            href={`/ar/login`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
              locale === 'ar'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            <Globe className="size-3" />
            AR
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto animate-fade-in">
          {/* Logo (mobile/tablet) */}
          <div className="flex flex-col items-center mb-10 lg:items-start">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25 mb-4">
              <Image src="/logo.svg" alt="Logo" width={30} height={30} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('auth.login')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('auth.login_subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t('auth.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  className="h-12 ps-10 pe-4 rounded-xl"
                  placeholder="name@company.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('auth.password')}
                </Label>
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-12 ps-10 pe-4 rounded-xl"
                  placeholder="••••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 btn-premium"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t('common.loading')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="size-4" />
                  {t('auth.signIn')}
                </span>
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {t('auth.demo_credentials')}
            </p>
            <div className="space-y-1 text-xs text-muted-foreground font-mono">
              <p>admin@crm.com / Admin@123!</p>
            </div>
          </div>

          {/* Mobile Footer */}
          <p className="text-center text-xs text-muted-foreground/50 mt-8 lg:hidden">
            &copy; 2026 CRM Pro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
