'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/PhoneInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Lock,
  Shield,
  Briefcase,
  Building2,
  ArrowLeft,
  Save,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { getApiErrorMessage } from '@/lib/api-error';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  jobTitle: z.string().optional(),
  phone: z.string().optional().refine(
    val => !val || val === '+971' || /^\+971[1-9]\d{7,8}$/.test(val),
    { message: 'Phone must be a valid UAE number (+971XXXXXXXXX)' }
  ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  roleId: z.string().min(1, 'Role is required'),
  status: z.enum(['ACTIVE', 'DISABLED']),
  departmentId: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface Department {
  id: string;
  name: string;
  nameAr: string | null;
}

export default function CreateUserPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [isLoading, setIsLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      status: 'ACTIVE',
      fullName: '',
      email: '',
      jobTitle: '',
      phone: '',
      password: '',
      roleId: '',
      departmentId: '',
    },
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/roles').then((res) => res.json()),
      fetch('/api/departments').then((res) => res.json()),
    ])
      .then(([rolesData, deptsData]) => {
        setRoles(rolesData.data);
        setDepartments(deptsData.data);
      })
      .catch(() => toast.error(t('errors.networkError')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: CreateUserForm) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(getApiErrorMessage(error.error || '', t));
        return;
      }

      toast.success(t('messages.createSuccess', { entity: t('users.title') }));
      router.push(`/${locale}/users`);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        icon={UserPlus}
        title={t('users.create')}
        subtitle={t('users.title')}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/users`)}
          >
            <ArrowLeft className="size-4 me-2 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-5 space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Info */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5 text-primary" />
                {t('users.fullName')}
              </CardTitle>
              <CardDescription>
                {t('common.email')} {locale === 'ar' ? 'و' : '&'} {t('common.phone')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.fullName')} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} disabled={isLoading} className="ps-10" placeholder={t('users.fullName')} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.email')} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} type="email" disabled={isLoading} className="ps-10" placeholder="email@company.com" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Job Title */}
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.jobTitle')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Briefcase className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} disabled={isLoading} className="ps-10" placeholder={t('users.jobTitle')} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.phone')}</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security & Role */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                {t('users.role')} {locale === 'ar' ? 'و' : '&'} {t('auth.password')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t('auth.password')} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} type="password" disabled={isLoading} className="ps-10" placeholder="••••••••" />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t('validation.password_requirements')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role */}
                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.role')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2">
                              <Shield className="size-4 text-muted-foreground" />
                              <SelectValue placeholder={t('common.select')} />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">{t('users.statusActive')}</SelectItem>
                          <SelectItem value="DISABLED">{t('users.statusDisabled')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Department */}
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tasks.department')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2">
                              <Building2 className="size-4 text-muted-foreground" />
                              <SelectValue placeholder={t('common.select')} />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">-</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {locale === 'ar' && dept.nameAr ? dept.nameAr : dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/users`)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[140px] btn-premium">
              {isLoading ? (
                <>
                  <Loader2 className="size-4 me-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="size-4 me-2" />
                  {t('common.create')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      </div>
      </div>
    </div>
  );
}
