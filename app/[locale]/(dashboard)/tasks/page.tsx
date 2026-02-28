'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Eye,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'DONE' | 'OVERDUE' | 'CANCELED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  escalationLevel: number;
  dueAt: string;
  completedAt: string | null;
  customer: {
    id: string;
    fullName: string;
  };
  assignedTo: {
    id: string;
    fullName: string;
  };
  createdBy: {
    id: string;
    fullName: string;
  };
  category: {
    id: string;
    name: string;
    nameAr: string | null;
    color: string;
  } | null;
  department: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
  _count: {
    comments: number;
  };
}

interface FilterOption {
  id: string;
  name: string;
  nameAr?: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  OPEN: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  DONE: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  OVERDUE: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  CANCELED: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  HIGH: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

const ESCALATION_CONFIG: Record<number, { color: string; bg: string }> = {
  0: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  1: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  2: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

export default function TasksPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [departments, setDepartments] = useState<FilterOption[]>([]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [catRes, deptRes] = await Promise.all([
          fetch('/api/task-categories'),
          fetch('/api/departments'),
        ]);
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.data);
        }
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(deptData.data);
        }
      } catch (error) {
        console.error('Error fetching filters:', error);
      }
    };
    fetchFilters();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (search) params.set('search', search);
      if (status && status !== 'all') params.set('status', status);
      if (priority && priority !== 'all') params.set('priority', priority);
      if (categoryId && categoryId !== 'all') params.set('categoryId', categoryId);
      if (departmentId && departmentId !== 'all') params.set('departmentId', departmentId);

      const response = await fetch(`/api/tasks?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      setTasks(data.data);
      setMeta(data.meta);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [page, search, status, priority, categoryId, departmentId]);

  const handleMarkAsDone = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      });

      if (!response.ok) throw new Error('Failed to update task');

      toast.success(t('messages.updateSuccess', { entity: t('tasks.title') }));
      fetchTasks();
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('tasks.today');
    if (diffDays === 1) return t('tasks.tomorrow');
    if (diffDays === -1) return t('tasks.yesterday');
    if (diffDays < 0) return `${Math.abs(diffDays)} ${t('tasks.daysAgo')}`;
    if (diffDays > 0) return `${diffDays} ${t('tasks.daysLeft')}`;

    return date.toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  const getEscalationLabel = (level: number) => {
    const labels = [t('tasks.levelNormal'), t('tasks.levelEscalated'), t('tasks.levelCritical')];
    return labels[level] || labels[0];
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('tasks.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {meta.total} {t('common.results')}
          </p>
        </div>
        <Link href={`/${locale}/tasks/new`}>
          <Button className="btn-premium">
            <Plus className="size-4" />
            {t('tasks.create')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="shadow-premium mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="ps-9"
              />
            </div>

            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
                <SelectItem value="OPEN">{t('tasks.statusOpen')}</SelectItem>
                <SelectItem value="DONE">{t('tasks.statusDone')}</SelectItem>
                <SelectItem value="OVERDUE">{t('tasks.statusOverdue')}</SelectItem>
                <SelectItem value="CANCELED">{t('tasks.statusCanceled')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('tasks.priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
                <SelectItem value="LOW">{t('tasks.priorityLow')}</SelectItem>
                <SelectItem value="MEDIUM">{t('tasks.priorityMedium')}</SelectItem>
                <SelectItem value="HIGH">{t('tasks.priorityHigh')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('tasks.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allCategories')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {locale === 'ar' && cat.nameAr ? cat.nameAr : cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('tasks.department')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.allDepartments')}</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {locale === 'ar' && dept.nameAr ? dept.nameAr : dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground mt-3">{t('common.loading')}</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t('common.noData')}</p>
        </div>
      ) : (
        <>
          <Card className="shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('tasks.taskTitle')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('tasks.customer')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('tasks.assignedTo')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('tasks.priority')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('tasks.dueDate')}
                    </th>
                    <th className="px-6 py-3.5 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          {task.escalationLevel > 0 && (
                            <AlertTriangle className={`size-4 mt-0.5 shrink-0 ${
                              task.escalationLevel === 2 ? 'text-red-500' : 'text-amber-500'
                            }`} />
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/${locale}/tasks/${task.id}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              {task.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              {task.category && (
                                <span
                                  className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                                  style={{ borderColor: task.category.color + '40', backgroundColor: task.category.color + '10', color: task.category.color }}
                                >
                                  {locale === 'ar' && task.category.nameAr ? task.category.nameAr : task.category.name}
                                </span>
                              )}
                              {task._count.comments > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <MessageSquare className="size-3" />
                                  {task._count.comments}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/${locale}/customers/${task.customer.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {task.customer.fullName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {task.assignedTo.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={`${PRIORITY_CONFIG[task.priority]?.bg} ${PRIORITY_CONFIG[task.priority]?.color} border`}>
                          {t(`tasks.priority${task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}`)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={`${STATUS_CONFIG[task.status]?.bg} ${STATUS_CONFIG[task.status]?.color} border`}>
                          {t(`tasks.status${task.status.charAt(0) + task.status.slice(1).toLowerCase()}`)}
                        </Badge>
                        {task.escalationLevel > 0 && (
                          <Badge variant="outline" className={`ms-1 ${ESCALATION_CONFIG[task.escalationLevel]?.bg} ${ESCALATION_CONFIG[task.escalationLevel]?.color} border`}>
                            {getEscalationLabel(task.escalationLevel)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="size-3.5 text-muted-foreground" />
                          <span className={task.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-foreground'}>
                            {formatDate(task.dueAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end">
                        <div className="flex items-center justify-end gap-1">
                          {(task.status === 'OPEN' || task.status === 'OVERDUE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsDone(task.id)}
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          )}
                          <Link href={`/${locale}/tasks/${task.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="size-4" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('common.showing')} {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} {t('common.of')} {meta.total} {t('common.results')}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="size-4" />
                  {t('common.previous')}
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page === meta.totalPages}
                  variant="outline"
                  size="sm"
                >
                  {t('common.next')}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
