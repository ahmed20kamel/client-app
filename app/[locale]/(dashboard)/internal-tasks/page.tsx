'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useSelection } from '@/hooks/use-selection';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock,
  ClipboardList,
  Trash2,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

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

interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function InternalTasksPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [tasks, setTasks] = useState<InternalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [session, setSession] = useState<Session | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);

  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected, isSomeSelected, selectedCount, isSelected } = useSelection(tasks);

  const isAdmin = session?.user?.role === 'Admin';

  // Fetch session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data?.user) setSession(data);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      }
    };
    fetchSession();
  }, []);

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
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, priority, departmentId]);

  const handleBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/internal-tasks/${id}`, { method: 'DELETE' })));
      toast.success(t('messages.deleteSuccess', { entity: t('internalTasks.title') }));
      clearSelection();
      setBulkDeleteOpen(false);
      fetchTasks();
    } catch {
      toast.error(t('common.error'));
    }
  };

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
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        title={t('internalTasks.title')}
        subtitle={`${meta.total} ${t('common.results')}`}
        icon={ClipboardList}
        actions={
          <Link href={`/${locale}/internal-tasks/new`}>
            <Button className="btn-premium">
              <Plus className="size-4" />
              {t('internalTasks.create')}
            </Button>
          </Link>
        }
      />

      <div className="p-5 space-y-5">
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

      {/* Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between animate-slide-down">
          <span className="text-sm font-medium text-primary">
            {t('common.selected', { count: selectedCount })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection}>{t('common.deselectAll')}</Button>
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="size-3.5 me-1" />{t('common.deleteSelected')}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('common.bulkDeleteConfirm', { count: selectedCount })}</AlertDialogTitle>
                  <AlertDialogDescription>{t('common.bulkDeleteConfirmDesc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">{t('internalTasks.noTasks')}</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {tasks.map((task) => (
              <Card key={task.id} className="shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <Checkbox
                      checked={isSelected(task.id)}
                      onCheckedChange={() => toggleOne(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <Link href={`/${locale}/internal-tasks/${task.id}`} className="text-sm font-semibold text-primary hover:underline flex-1 min-w-0 truncate">
                          {task.title}
                        </Link>
                        <span className="shrink-0 ms-2">
                          <StatusBadge status={task.status} label={getStatusLabel(task.status)} size="sm" />
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                        <div className="truncate">{task.assignedTo.fullName}</div>
                        <StatusBadge status={task.priority} label={getPriorityLabel(task.priority)} size="sm" />
                        {task.dueAt && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3 shrink-0" />
                            <span>{formatDate(task.dueAt)}</span>
                          </div>
                        )}
                        {task.rating && <div>{renderStars(task.rating.rating)}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end border-t pt-2">
                    <Link href={`/${locale}/internal-tasks/${task.id}`}>
                      <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                        <Eye className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card className="shadow-premium overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-4 py-3 w-12">
                      <Checkbox checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false} onCheckedChange={toggleAll} />
                    </th>
                    <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('internalTasks.taskTitle')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('internalTasks.assignee')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('internalTasks.priority')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('internalTasks.dueDate')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('rating.stars')}
                    </th>
                    <th className="px-4 py-3 text-end text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/internal-tasks/${task.id}`)}>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected(task.id)} onCheckedChange={() => toggleOne(task.id)} />
                      </td>
                      <td className="px-7 py-4">
                        <Link
                          href={`/${locale}/internal-tasks/${task.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground text-center">
                        {task.assignedTo.fullName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <StatusBadge status={task.priority} label={getPriorityLabel(task.priority)} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <StatusBadge status={task.status} label={getStatusLabel(task.status)} />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {task.dueAt ? (
                          <div className="flex items-center justify-center gap-1.5 text-sm">
                            <Clock className="size-3.5 text-muted-foreground" />
                            <span className="text-foreground">{formatDate(task.dueAt)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {task.rating ? (
                          <div className="flex justify-center">{renderStars(task.rating.rating)}</div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-end" onClick={(e) => e.stopPropagation()}>
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
                  <ChevronLeft className="size-4 rtl:-scale-x-100" />
                  {t('common.previous')}
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page === meta.totalPages}
                  variant="outline"
                  size="sm"
                >
                  {t('common.next')}
                  <ChevronRight className="size-4 rtl:-scale-x-100" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
      </div>
    </div>
  );
}
