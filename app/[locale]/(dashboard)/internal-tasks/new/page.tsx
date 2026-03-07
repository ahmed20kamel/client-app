'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  AlignLeft,
  UserCheck,
  Building2,
  Tag,
  Flag,
  Calendar,
  PlusCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface User {
  id: string;
  fullName: string;
}

interface Department {
  id: string;
  name: string;
  nameAr?: string | null;
}

interface Category {
  id: string;
  name: string;
  nameAr?: string | null;
  color: string;
}

export default function CreateInternalTaskPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueAt, setDueAt] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, deptsRes, catsRes] = await Promise.all([
          fetch('/api/users?limit=1000'),
          fetch('/api/departments'),
          fetch('/api/task-categories'),
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.data);
        }

        if (deptsRes.ok) {
          const deptsData = await deptsRes.json();
          setDepartments(deptsData.data);
        }

        if (catsRes.ok) {
          const catsData = await catsRes.json();
          setCategories(catsData.data);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error(t('validation.required'));
      return;
    }

    setIsLoading(true);
    try {
      const body: Record<string, string> = {
        title,
        priority,
      };

      if (description) body.description = description;
      if (assignedToId) body.assignedToId = assignedToId;
      if (departmentId) body.departmentId = departmentId;
      if (categoryId) body.categoryId = categoryId;
      if (dueAt) body.dueAt = dueAt;

      const response = await fetch('/api/internal-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(getApiErrorMessage(error.error || '', t));
        return;
      }

      toast.success(t('messages.createSuccess', { entity: t('internalTasks.title') }));
      router.push(`/${locale}/internal-tasks`);
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
        icon={PlusCircle}
        title={t('internalTasks.create')}
        subtitle={t('internalTasks.subtitle')}
        actions={
          <Button variant="outline" onClick={() => router.push(`/${locale}/internal-tasks`)}>
            <ArrowLeft className="size-4 me-2 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-5 space-y-5">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Details */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              {t('internalTasks.taskDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">{t('internalTasks.taskTitle')} *</Label>
              <div className="relative mt-1">
                <FileText className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLoading}
                  className="ps-10"
                  placeholder={t('internalTasks.taskTitle')}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">{t('internalTasks.description')}</Label>
              <div className="relative mt-1">
                <AlignLeft className="absolute start-3 top-3 size-4 text-muted-foreground" />
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background ps-10 pe-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  placeholder={t('internalTasks.description')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment & Schedule */}
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" />
              {t('internalTasks.assignTo')} {locale === 'ar' ? 'و' : '&'} {t('internalTasks.dueDate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assign To */}
              <div>
                <Label>{t('internalTasks.assignTo')} *</Label>
                <Select value={assignedToId} onValueChange={setAssignedToId} disabled={isLoading}>
                  <SelectTrigger className="w-full mt-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className="size-4 text-muted-foreground" />
                      <SelectValue placeholder={t('internalTasks.selectEmployee')} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department */}
              <div>
                <Label>{t('internalTasks.department')}</Label>
                <Select value={departmentId} onValueChange={setDepartmentId} disabled={isLoading}>
                  <SelectTrigger className="w-full mt-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-muted-foreground" />
                      <SelectValue placeholder={t('tasks.selectDepartment')} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {locale === 'ar' && dept.nameAr ? dept.nameAr : dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <Label>{t('internalTasks.category')}</Label>
                <Select value={categoryId} onValueChange={setCategoryId} disabled={isLoading}>
                  <SelectTrigger className="w-full mt-1">
                    <div className="flex items-center gap-2">
                      <Tag className="size-4 text-muted-foreground" />
                      <SelectValue placeholder={t('tasks.selectCategory')} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {locale === 'ar' && cat.nameAr ? cat.nameAr : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <Label>{t('internalTasks.priority')} *</Label>
                <Select value={priority} onValueChange={setPriority} disabled={isLoading}>
                  <SelectTrigger className="w-full mt-1">
                    <div className="flex items-center gap-2">
                      <Flag className="size-4 text-muted-foreground" />
                      <SelectValue placeholder={t('internalTasks.priority')} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">{t('internalTasks.priorityLow')}</SelectItem>
                    <SelectItem value="MEDIUM">{t('internalTasks.priorityMedium')}</SelectItem>
                    <SelectItem value="HIGH">{t('internalTasks.priorityHigh')}</SelectItem>
                    <SelectItem value="URGENT">{t('internalTasks.priorityUrgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div>
                <Label htmlFor="dueAt">{t('internalTasks.dueDate')}</Label>
                <div className="relative mt-1">
                  <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="dueAt"
                    type="date"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    disabled={isLoading}
                    className="ps-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${locale}/internal-tasks`)}
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
      </div>
      </div>
    </div>
  );
}
