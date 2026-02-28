'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Briefcase,
  Building2,
  ArrowLeft,
  Save,
  Loader2,
} from 'lucide-react';

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    )
    .optional()
    .or(z.literal('')),
  roleId: z.string().min(1, 'Role is required'),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

type UpdateUserForm = z.infer<typeof updateUserSchema>;

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

interface UserData {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'DISABLED';
  role: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
}

export default function EditUserPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const userId = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const form = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/roles').then((res) => res.json()),
      fetch('/api/departments').then((res) => res.json()),
      fetch(`/api/users/${userId}`).then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
      }),
    ])
      .then(([rolesData, deptsData, userData]) => {
        setRoles(rolesData.data);
        setDepartments(deptsData.data);
        const user: UserData = userData.data;
        form.reset({
          email: user.email,
          fullName: user.fullName,
          jobTitle: user.jobTitle || '',
          phone: user.phone || '',
          roleId: user.role?.id || '',
          status: user.status,
          password: '',
        });
        setSelectedDeptId(user.department?.id || '');
        setLoadingUser(false);
      })
      .catch(() => {
        toast.error(t('common.error'));
        router.push(`/${locale}/users`);
      });
  }, [userId]);

  const onSubmit = async (data: UpdateUserForm) => {
    setIsLoading(true);
    try {
      const submitData: Record<string, unknown> = { ...data };
      if (!submitData.password) {
        delete submitData.password;
      }
      submitData.departmentId = selectedDeptId || null;

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('users.title') }));
      router.push(`/${locale}/users`);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('users.edit')}</h1>
          <p className="text-muted-foreground mt-1">{form.getValues('fullName')}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/users`)}
        >
          <ArrowLeft className="size-4 me-2" />
          {t('common.back')}
        </Button>
      </div>

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
                {t('common.email')} &amp; {t('common.phone')}
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
                        <div className="relative">
                          <Phone className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} disabled={isLoading} className="ps-10" placeholder="+971" />
                        </div>
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
                {t('users.role')} &amp; {t('auth.password')}
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
                      <FormLabel>{t('auth.new_password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} type="password" disabled={isLoading} className="ps-10" placeholder="••••••••" />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Leave blank to keep current password
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
                <FormItem>
                  <FormLabel>{t('departments.title')}</FormLabel>
                  <Select
                    value={selectedDeptId || 'NONE'}
                    onValueChange={(val) => setSelectedDeptId(val === 'NONE' ? '' : val)}
                    disabled={isLoading}
                  >
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
                </FormItem>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
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
                  {t('common.save')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
