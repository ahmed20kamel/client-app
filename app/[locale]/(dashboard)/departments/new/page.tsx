'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { Building2, ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';
import { createDepartmentSchema, type CreateDepartmentInput } from '@/lib/validations/escalation';

interface DeptOption {
  id: string;
  name: string;
  nameAr: string | null;
}

interface UserOption {
  id: string;
  fullName: string;
}

export default function NewDepartmentPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [isLoading, setIsLoading] = useState(false);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const form = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: {
      name: '',
      nameAr: '',
      description: '',
      parentId: null,
      managerId: null,
    },
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptsRes, usersRes] = await Promise.all([
          fetch('/api/departments'),
          fetch('/api/users?limit=100'),
        ]);

        if (deptsRes.ok) {
          const data = await deptsRes.json();
          setDepartments(data.data);
        }
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.data);
        }
      } catch {
        // Silently handle - options will be empty
      }
    };
    fetchOptions();
  }, []);

  const onSubmit = async (data: CreateDepartmentInput) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        toast.error(getApiErrorMessage(result.error || '', t));
        return;
      }

      toast.success(t('messages.createSuccess', { entity: t('departments.title') }));
      router.push(`/${locale}/departments`);
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
        icon={Building2}
        title={t('departments.create')}
        actions={
          <Link href={`/${locale}/departments`}>
            <Button variant="ghost" size="icon" className="size-10 rounded-xl">
              <ArrowLeft className="size-5 rtl:-scale-x-100" />
            </Button>
          </Link>
        }
      />

      <div className="p-5 space-y-5">
      {/* Form */}
      <Card className="shadow-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            {t('departments.create')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name (EN) */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('departments.nameEn')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Sales" disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name (AR) */}
              <FormField
                control={form.control}
                name="nameAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('departments.nameAr')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="مثال: المبيعات"
                        disabled={isLoading}
                        dir="rtl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.description')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder={t('common.description')}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Parent Department */}
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('departments.parent')}</FormLabel>
                    <Select
                      value={field.value || 'NONE'}
                      onValueChange={(val) => field.onChange(val === 'NONE' ? null : val)}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('departments.noParent')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">{t('departments.noParent')}</SelectItem>
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

              {/* Manager */}
              <FormField
                control={form.control}
                name="managerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('departments.manager')}</FormLabel>
                    <Select
                      value={field.value || 'NONE'}
                      onValueChange={(val) => field.onChange(val === 'NONE' ? null : val)}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">-</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="submit"
                  className="btn-premium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {t('common.loading')}
                    </span>
                  ) : (
                    t('common.save')
                  )}
                </Button>
                <Link href={`/${locale}/departments`}>
                  <Button type="button" variant="outline">
                    {t('common.cancel')}
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
