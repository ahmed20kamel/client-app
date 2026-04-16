'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Search, Eye, CheckCircle2, AlertCircle, MessageSquare, AlertTriangle, Clock, CheckSquare,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useListPage } from '@/hooks/useListPage';
import { intlLocale } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status: 'OPEN' | 'DONE' | 'OVERDUE' | 'CANCELED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  escalationLevel: number;
  dueAt: string;
  customer: { id: string; fullName: string };
  assignedTo: { id: string; fullName: string };
  category: { id: string; name: string; nameAr: string | null; color: string } | null;
  _count: { comments: number };
}

interface FilterOption { id: string; name: string; nameAr?: string | null }

const ESCALATION_CONFIG: Record<number, { color: string; bg: string }> = {
  0: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  1: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  2: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

export default function TasksPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [departments, setDepartments] = useState<FilterOption[]>([]);

  const { data: tasks, loading, search, setSearch, setFilter, page, setPage, meta, refresh } =
    useListPage<Task>({
      endpoint: '/api/tasks',
      fetchErrorMsg: t('common.error'),
    });

  useEffect(() => {
    Promise.all([fetch('/api/task-categories'), fetch('/api/departments')])
      .then(async ([catRes, deptRes]) => {
        if (catRes.ok) setCategories((await catRes.json()).data || []);
        if (deptRes.ok) setDepartments((await deptRes.json()).data || []);
      }).catch(() => {});
  }, []);

  const handleMarkAsDone = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('messages.updateSuccess', { entity: t('tasks.title') }));
      refresh();
    } catch { toast.error(t('common.error')); }
  };

  const fmtDue = (dateString: string) => {
    const date = new Date(dateString);
    const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);
    if (diffDays === 0) return t('tasks.today');
    if (diffDays === 1) return t('tasks.tomorrow');
    if (diffDays === -1) return t('tasks.yesterday');
    if (diffDays < 0) return `${Math.abs(diffDays)} ${t('tasks.daysAgo')}`;
    if (diffDays > 0) return `${diffDays} ${t('tasks.daysLeft')}`;
    return date.toLocaleDateString(intlLocale(locale));
  };

  const getEscalationLabel = (level: number) =>
    [t('tasks.levelNormal'), t('tasks.levelEscalated'), t('tasks.levelCritical')][level] || t('tasks.levelNormal');

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('tasks.title')}
          subtitle={`${meta.total} ${t('common.results')}`}
          icon={CheckSquare}
          actions={
            <Link href={`/${locale}/tasks/new`}>
              <Button className="btn-premium">
                <Plus className="size-4" />
                {t('tasks.create')}
              </Button>
            </Link>
          }
        />

        <div className="p-5 space-y-5">
          {/* Filters */}
          <Card className="shadow-premium">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
                </div>
                <Select defaultValue="all" onValueChange={(v) => setFilter('status', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('common.status')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('tasks.allStatuses')}</SelectItem>
                    <SelectItem value="OPEN">{t('tasks.statusOpen')}</SelectItem>
                    <SelectItem value="DONE">{t('tasks.statusDone')}</SelectItem>
                    <SelectItem value="OVERDUE">{t('tasks.statusOverdue')}</SelectItem>
                    <SelectItem value="CANCELED">{t('tasks.statusCanceled')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all" onValueChange={(v) => setFilter('priority', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('tasks.priority')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
                    <SelectItem value="LOW">{t('tasks.priorityLow')}</SelectItem>
                    <SelectItem value="MEDIUM">{t('tasks.priorityMedium')}</SelectItem>
                    <SelectItem value="HIGH">{t('tasks.priorityHigh')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all" onValueChange={(v) => setFilter('categoryId', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('tasks.category')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('tasks.allCategories')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{locale === 'ar' && cat.nameAr ? cat.nameAr : cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select defaultValue="all" onValueChange={(v) => setFilter('departmentId', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('tasks.department')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('tasks.allDepartments')}</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{locale === 'ar' && dept.nameAr ? dept.nameAr : dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : tasks.length === 0 ? (
            <Card className="shadow-premium">
              <CardContent className="p-0">
                <EmptyState title={t('common.noData')} icon={AlertCircle} />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id} className="shadow-premium">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {task.escalationLevel > 0 && <AlertTriangle className={`size-3.5 shrink-0 ${task.escalationLevel === 2 ? 'text-destructive' : 'text-warning'}`} />}
                            <Link href={`/${locale}/tasks/${task.id}`} className="text-sm font-semibold text-primary hover:underline truncate">{task.title}</Link>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{task.customer.fullName}</p>
                        </div>
                        <StatusBadge status={task.status} label={t(`tasks.status${task.status.charAt(0) + task.status.slice(1).toLowerCase()}`)} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5"><Clock className="size-3 shrink-0" /><span className={task.status === 'OVERDUE' ? 'text-destructive font-medium' : ''}>{fmtDue(task.dueAt)}</span></div>
                        <div className="truncate">{task.assignedTo.fullName}</div>
                        <StatusBadge status={task.priority} label={t(`tasks.priority${task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}`)} size="sm" />
                        {task.category && <span className="text-[10px] truncate" style={{ color: task.category.color }}>{locale === 'ar' && task.category.nameAr ? task.category.nameAr : task.category.name}</span>}
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t pt-2">
                        {(task.status === 'OPEN' || task.status === 'OVERDUE') && (
                          <Button variant="ghost" size="icon" className="size-11 text-success" onClick={() => handleMarkAsDone(task.id)}><CheckCircle2 className="size-4" /></Button>
                        )}
                        <Link href={`/${locale}/tasks/${task.id}`}><Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary"><Eye className="size-4" /></Button></Link>
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
                      <tr className="border-b bg-muted/30">
                        {[t('tasks.taskTitle'), t('tasks.customer'), t('tasks.assignedTo'), t('tasks.priority'), t('common.status'), t('tasks.dueDate'), t('common.actions')].map((h, i) => (
                          <th key={i} className={`px-4 py-3 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider ${i === 0 ? 'text-start first:px-7' : i === 6 ? 'text-end' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/tasks/${task.id}`)}>
                          <td className="px-7 py-4">
                            <div className="flex items-start gap-2">
                              {task.escalationLevel > 0 && <AlertTriangle className={`size-4 mt-0.5 shrink-0 ${task.escalationLevel === 2 ? 'text-red-500' : 'text-amber-500'}`} />}
                              <div className="min-w-0">
                                <Link href={`/${locale}/tasks/${task.id}`} className="text-sm font-medium text-primary hover:underline">{task.title}</Link>
                                <div className="flex items-center gap-2 mt-1">
                                  {task.category && (
                                    <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                                      style={{ borderColor: task.category.color + '40', backgroundColor: task.category.color + '10', color: task.category.color }}>
                                      {locale === 'ar' && task.category.nameAr ? task.category.nameAr : task.category.name}
                                    </span>
                                  )}
                                  {task._count.comments > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><MessageSquare className="size-3" />{task._count.comments}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Link href={`/${locale}/customers/${task.customer.id}`} className="text-sm text-primary hover:underline">{task.customer.fullName}</Link>
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-foreground">{task.assignedTo.fullName}</td>
                          <td className="px-4 py-4 text-center">
                            <StatusBadge status={task.priority} label={t(`tasks.priority${task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}`)} />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <StatusBadge status={task.status} label={t(`tasks.status${task.status.charAt(0) + task.status.slice(1).toLowerCase()}`)} />
                            {task.escalationLevel > 0 && (
                              <span className={`ms-1 inline-flex items-center px-2.5 py-0.5 text-xs rounded-full font-medium border ${ESCALATION_CONFIG[task.escalationLevel]?.bg} ${ESCALATION_CONFIG[task.escalationLevel]?.color}`}>
                                {getEscalationLabel(task.escalationLevel)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-sm">
                              <Clock className="size-3.5 text-muted-foreground" />
                              <span className={task.status === 'OVERDUE' ? 'text-destructive font-medium' : 'text-foreground'}>{fmtDue(task.dueAt)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-end" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {(task.status === 'OPEN' || task.status === 'OVERDUE') && (
                                <Button variant="ghost" size="sm" onClick={() => handleMarkAsDone(task.id)} className="text-success hover:text-success/80">
                                  <CheckCircle2 className="size-4" />
                                </Button>
                              )}
                              <Link href={`/${locale}/tasks/${task.id}`}><Button variant="ghost" size="sm"><Eye className="size-4" /></Button></Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
