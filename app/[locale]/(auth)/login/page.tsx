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
import { Toaster, toast } from 'sonner';
import { LogIn, Mail, Lock, Building2, Shield, BarChart3, Users } from 'lucide-react';

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

  const features = [
    { icon: Users, label: isRtl ? 'إدارة العملاء' : 'Client Management' },
    { icon: BarChart3, label: isRtl ? 'التقارير والتحليلات' : 'Reports & Analytics' },
    { icon: Shield, label: isRtl ? 'أمان متقدم' : 'Advanced Security' },
    { icon: Building2, label: isRtl ? 'إدارة الأقسام' : 'Department Management' },
  ];

  return (
    <div
      className="min-h-screen flex"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <Toaster position={isRtl ? 'top-left' : 'top-right'} richColors />

      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/login-bg.jpg"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Top - Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Image src="/logo.svg" alt="Logo" width={32} height={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold">CRM Pro</h1>
              <p className="text-xs text-white/60">Enterprise Edition</p>
            </div>
          </div>

          {/* Center - Hero Text */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
                {t('auth.hero_title')}
              </h2>
              <p className="text-lg text-white/80 max-w-md">
                {t('auth.hero_subtitle')}
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.label}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm"
                  >
                    <Icon className="w-5 h-5 text-white/80 shrink-0" />
                    <span className="text-sm text-white/90">{feature.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom */}
          <p className="text-sm text-white/40">
            &copy; 2026 CRM Pro. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
              <Image src="/logo.svg" alt="Logo" width={28} height={28} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">CRM Pro</h1>
              <p className="text-xs text-muted-foreground">Enterprise Edition</p>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-bold text-foreground">{t('auth.login')}</h2>
            <p className="text-muted-foreground">{t('auth.login_subtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t('auth.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  className="h-12 ps-11 pe-4 rounded-xl border-border/60 bg-secondary/30 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="name@company.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
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
                  className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  {t('auth.forgot_password')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-12 ps-11 pe-4 rounded-xl border-border/60 bg-secondary/30 text-sm placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="••••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-sm font-semibold gradient-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 btn-premium"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('common.loading')}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-[18px] h-[18px]" />
                  {t('auth.signIn')}
                </span>
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 rounded-xl bg-secondary/50 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t('auth.demo_credentials')}
            </p>
            <div className="space-y-1.5 text-xs text-muted-foreground/80">
              <div className="flex items-center justify-between">
                <span>Admin:</span>
                <code className="px-2 py-0.5 rounded bg-background text-foreground/80 font-mono">admin@example.com / Admin123!</code>
              </div>
              <div className="flex items-center justify-between">
                <span>Employee:</span>
                <code className="px-2 py-0.5 rounded bg-background text-foreground/80 font-mono">ali@example.com / Employee123!</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
