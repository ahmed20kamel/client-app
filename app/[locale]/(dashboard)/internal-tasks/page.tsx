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
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
} from 'lucide-react';

interface InternalTask {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueAt: string | null;
  createdAt: string;
  assignedTo: {
    id: string;
    fullName: string;
  };
  createdBy: {
    id: string;
    fullName: string;
  };
  department: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
  category: {
    id: string;
    name: string;
    nameAr: string | null;
    color: string;
  } | null;
  rating: {
    rating: number;
    comment: string | null;
  } | null;
  _count: {
    comments: number;
  };
}

interface Department {
  id: string;
  name: string;
  nameAr?: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-gray-50 border-gray-200 text-gray-700',
  IN_PROGRESS: 'bg-blue-50 border-blue-200 text-blue-700',
  SUBMITTED: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  APPROVED: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  REJECTED: 'bg-red-50 border-red-200 text-red-700',
  DONE: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-gray-50 border-gray-200 text-gray-700',
  MEDIUM: 'bg-gray-100 border-gray-300 text-gray-800',
  HIGH: 'bg-orange-50 border-orange-200 text-orange-700',
  URGENT: 'bg-red-50 border-red-200 text-red-700',
};

export default function InternalTasksPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const [departments, setDepartments] = useState<Department[]>([]);

  // Fetch departments for filter
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      if (search) queryParams.set('search', search);
      if (status && status !== 'all') queryParams.set('status', status);
      if (priority && priority !== 'all') queryParams.set('priority', priority);
      if (departmentId && departmentId !== 'all') queryParams.set('departmentId', departmentId);

      const response = await fetch(`/api/internal-tasks?${queryParams.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch internal tasks');
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
  }, [page, search, status, priority, departmentId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      OPEN: t('internalTasks.statusOpen'),
      IN_PROGRESS: t('internalTasks.statusInProgress'),
      SUBMITTED: t('internalTasks.statusSubmitted'),
      APPROVED: t('internalTasks.statusApproved'),
      REJECTED: t('internalTasks.statusRejected'),
      DONE: t('internalTasks.statusDone'),
    };
    return map[s] || s;
  };

  const getPriorityLabel = (p: string) => {
    const map: Record<string, string> = {
      LOW: t('internalTasks.priorityLow'),
      MEDIUM: t('internalTasks.priorityMedium'),
      HIGH: t('internalTasks.priorityHigh'),
      URGENT: t('internalTasks.priorityUrgent'),
    };
    return map[p] || p;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`size-3.5 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('internalTasks.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {meta.total} {t('common.results')}
          </p>
        </div>
        <Link href={`/${locale}/internal-tasks/new`}>
          <Button className="btn-premium">
            <Plus className="size-4" />
            {t('internalTasks.create')}
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
                <SelectItem value="all">{t('internalTasks.allStatuses')}</SelectItem>
                <SelectItem value="OPEN">{t('internalTasks.statusOpen')}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t('internalTasks.statusInProgress')}</SelectItem>
                <SelectItem value="SUBMITTED">{t('internalTasks.statusSubmitted')}</SelectItem>
                <SelectItem value="APPROVED">{t('internalTasks.statusApproved')}</SelectItem>
                <SelectItem value="REJECTED">{t('internalTasks.statusRejected')}</SelectItem>
                <SelectItem value="DONE">{t('internalTasks.statusDone')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={(v) => { setPriority(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('internalTasks.priority')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('internalTasks.allPriorities')}</SelectItem>
                <SelectItem value="LOW">{t('internalTasks.priorityLow')}</SelectItem>
                <SelectItem value="MEDIUM">{t('internalTasks.priorityMedium')}</SelectItem>
                <SelectItem value="HIGH">{t('internalTasks.priorityHigh')}</SelectItem>
                <SelectItem value="URGENT">{t('internalTasks.priorityUrgent')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('internalTasks.department')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('internalTasks.allDepartments')}</SelectItem>
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
          <p className="text-muted-foreground">{t('internalTasks.noTasks')}</p>
        </div>
      ) : (
        <>
          <Card className="shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('internalTasks.taskTitle')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('internalTasks.assignee')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('internalTasks.priority')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('internalTasks.dueDate')}
                    </th>
                    <th className="px-6 py-3.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('rating.stars')}
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
                        <Link
                          href={`/${locale}/internal-tasks/${task.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {task.assignedTo.fullName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={`${PRIORITY_BADGE[task.priority]} border`}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className={`${STATUS_BADGE[task.status]} border`}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.dueAt ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="size-3.5 text-muted-foreground" />
                            <span className="text-foreground">{formatDate(task.dueAt)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.rating ? (
                          renderStars(task.rating.rating)
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/${locale}/internal-tasks/${task.id}`}>
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
