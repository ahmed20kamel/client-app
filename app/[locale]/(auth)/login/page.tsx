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
import { LogIn, Mail, Lock, Loader2, Building2, Users, BarChart3, Globe, Eye, EyeOff, Sparkles, ShieldCheck, Zap } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="/login-bg.jpg"
          alt="CRM Pro"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay with subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-800/75 to-slate-900/85" />

        {/* Subtle geometric patterns */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Top - Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center">
              <Sparkles className="size-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">CRM Pro</h2>
              <p className="text-[11px] text-white/50 font-medium tracking-wider uppercase">Enterprise Edition</p>
            </div>
          </div>

          {/* Center - Hero Text */}
          <div className="space-y-8 max-w-lg">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-[2.75rem] font-bold leading-[1.15] tracking-tight">
                {t('auth.hero_title')}
              </h1>
              <p className="text-base text-white/50 leading-relaxed max-w-sm">
                {t('auth.hero_subtitle')}
              </p>
            </div>

            {/* Feature Cards */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.06]">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Users className="size-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{t('navigation.customers')}</p>
                  <p className="text-xs text-white/40">{isRtl ? 'إدارة متكاملة للعملاء' : 'Complete customer management'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.06]">
                <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Building2 className="size-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{t('navigation.departments')}</p>
                  <p className="text-xs text-white/40">{isRtl ? 'تنظيم الأقسام والفرق' : 'Organize teams & departments'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-sm rounded-xl px-4 py-3 border border-white/[0.06]">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <BarChart3 className="size-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{t('navigation.reports')}</p>
                  <p className="text-xs text-white/40">{isRtl ? 'تقارير وتحليلات متقدمة' : 'Advanced analytics & reports'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/30">
              &copy; 2026 CRM Pro. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-white/30">
                <ShieldCheck className="size-3.5" />
                <span>{isRtl ? 'آمن ومشفر' : 'Secure & Encrypted'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-white/30">
                <Zap className="size-3.5" />
                <span>{isRtl ? 'أداء عالي' : 'High Performance'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 bg-gray-50/80 relative">
        {/* Language Switcher - Top */}
        <div className="absolute top-6 start-6 flex gap-1.5">
          <Link
            href={`/ar/login`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              locale === 'ar'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-500 hover:bg-white/80 border border-slate-200'
            }`}
          >
            <Globe className="size-3" />
            AR
          </Link>
          <Link
            href={`/en/login`}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              locale === 'en'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-500 hover:bg-white/80 border border-slate-200'
            }`}
          >
            <Globe className="size-3" />
            EN
          </Link>
        </div>

        <div className="w-full max-w-[400px] animate-fade-in">
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20 mb-5">
              <Sparkles className="size-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t('auth.login')}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {t('auth.login_subtitle')}
            </p>
          </div>

          {/* White Card Form */}
          <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 p-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  {t('auth.email')}
                </Label>
                <div className="relative">
                  <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    className="h-12 ps-11 pe-4 rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:border-primary focus-visible:ring-primary/15 placeholder:text-slate-400"
                    placeholder={isRtl ? 'admin@example.com' : 'name@company.com'}
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
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
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
                  <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="h-12 ps-11 pe-12 rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:border-primary focus-visible:ring-primary/15 placeholder:text-slate-400"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-900/10 transition-all duration-200"
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
          </div>

          {/* Demo Credentials */}
          <div className="mt-5 p-4 rounded-xl bg-white border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-500 mb-1.5">
              {t('auth.demo_credentials')}
            </p>
            <p className="text-xs text-slate-400 font-mono">
              admin@crm.com / Admin@123!
            </p>
          </div>

          {/* Mobile Footer */}
          <p className="text-center text-xs text-slate-400/70 mt-8 lg:hidden">
            &copy; 2026 CRM Pro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
