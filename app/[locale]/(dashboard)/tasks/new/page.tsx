'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, CreateTaskInput } from '@/lib/validations/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  CheckSquare,
  Users,
  UserCheck,
  FileText,
  Calendar,
  Flag,
  ArrowLeft,
  Save,
  Loader2,
  AlignLeft,
} from 'lucide-react';

interface Customer {
  id: string;
  fullName: string;
}

interface User {
  id: string;
  fullName: string;
}

export default function CreateTaskPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const preselectedCustomerId = searchParams.get('customerId');

  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      priority: 'MEDIUM',
      status: 'OPEN',
      customerId: preselectedCustomerId || '',
      assignedToId: '',
      title: '',
      description: '',
      dueAt: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, usersRes] = await Promise.all([
          fetch('/api/customers?limit=1000'),
          fetch('/api/users?limit=1000'),
        ]);

        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData.data);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: CreateTaskInput) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.createSuccess', { entity: t('tasks.title') }));

      if (preselectedCustomerId) {
        router.push(`/${locale}/customers/${preselectedCustomerId}`);
      } else {
        router.push(`/${locale}/tasks`);
      }
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (preselectedCustomerId) {
      router.push(`/${locale}/customers/${preselectedCustomerId}`);
    } else {
      router.push(`/${locale}/tasks`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('tasks.create')}</h1>
          <p className="text-muted-foreground mt-1">{t('tasks.title')}</p>
        </div>
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="size-4 me-2" />
          {t('common.back')}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Task Details */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-5 text-primary" />
                {t('tasks.taskTitle')}
              </CardTitle>
              <CardDescription>
                {t('tasks.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tasks.taskTitle')} *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <FileText className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input {...field} disabled={isLoading} className="ps-10" placeholder={t('tasks.taskTitle')} />
                      </div>
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
                    <FormLabel>{t('tasks.description')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AlignLeft className="absolute start-3 top-3 size-4 text-muted-foreground" />
                        <textarea
                          {...field}
                          disabled={isLoading}
                          rows={4}
                          className="flex w-full rounded-md border border-input bg-background ps-10 pe-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                          placeholder={t('tasks.description')}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Assignment & Schedule */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                {t('tasks.assignedTo')} & {t('tasks.dueDate')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer */}
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tasks.customer')} *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoading || !!preselectedCustomerId}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2">
                              <Users className="size-4 text-muted-foreground" />
                              <SelectValue placeholder={t('tasks.selectCustomer')} />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Assigned To */}
                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tasks.assignedTo')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2">
                              <UserCheck className="size-4 text-muted-foreground" />
                              <SelectValue placeholder={t('tasks.selectAssignee')} />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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

                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="dueAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tasks.dueDate')} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} type="datetime-local" disabled={isLoading} className="ps-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('tasks.priority')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2">
                              <Flag className="size-4 text-muted-foreground" />
                              <SelectValue placeholder={t('tasks.priority')} />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LOW">{t('tasks.priorityLow')}</SelectItem>
                          <SelectItem value="MEDIUM">{t('tasks.priorityMedium')}</SelectItem>
                          <SelectItem value="HIGH">{t('tasks.priorityHigh')}</SelectItem>
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
          <div className="flex items-center justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
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
  );
}
