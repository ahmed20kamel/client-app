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
import { Building2, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { updateDepartmentSchema, type UpdateDepartmentInput } from '@/lib/validations/escalation';

interface DeptOption {
  id: string;
  name: string;
  nameAr: string | null;
}

interface UserOption {
  id: string;
  fullName: string;
}

export default function EditDepartmentPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const deptId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const form = useForm<UpdateDepartmentInput>({
    resolver: zodResolver(updateDepartmentSchema),
    defaultValues: {
      name: '',
      nameAr: '',
      description: '',
      parentId: null,
      managerId: null,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, deptsRes, usersRes] = await Promise.all([
          fetch(`/api/departments/${deptId}`),
          fetch('/api/departments'),
          fetch('/api/users?limit=100'),
        ]);

        if (deptRes.ok) {
          const data = await deptRes.json();
          const dept = data.data;
          form.reset({
            name: dept.name,
            nameAr: dept.nameAr || '',
            description: dept.description || '',
            parentId: dept.parent?.id || null,
            managerId: dept.manager?.id || null,
          });
        } else {
          toast.error(t('messages.notFound', { entity: t('departments.title') }));
          router.push(`/${locale}/departments`);
          return;
        }

        if (deptsRes.ok) {
          const data = await deptsRes.json();
          // Exclude current department from parent options
          setDepartments(data.data.filter((d: DeptOption) => d.id !== deptId));
        }
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data.data);
        }
      } catch {
        toast.error(t('common.error'));
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [deptId]);

  const onSubmit = async (data: UpdateDepartmentInput) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/departments/${deptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        toast.error(result.error || t('common.error'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('departments.title') }));
      router.push(`/${locale}/departments`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 lg:mb-8">
        <Link href={`/${locale}/departments`}>
          <Button variant="ghost" size="icon" className="size-10 rounded-xl">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('departments.edit')}</h1>
        </div>
      </div>

      {/* Form */}
      <Card className="shadow-premium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            {t('departments.edit')}
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
                    <FormLabel>{t('departments.name')} (English) *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} disabled={isLoading} />
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
  );
}
