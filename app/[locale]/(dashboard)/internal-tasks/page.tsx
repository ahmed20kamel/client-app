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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Search, Eye, Clock, ClipboardList, Trash2, Star } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useListPage } from '@/hooks/useListPage';
import { formatDate } from '@/lib/utils';

interface InternalTask {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueAt: string | null;
  createdAt: string;
  assignedTo: { id: string; fullName: string };
  createdBy: { id: string; fullName: string };
  department: { id: string; name: string; nameAr: string | null } | null;
  category: { id: string; name: string; nameAr: string | null; color: string } | null;
  rating: { rating: number; comment: string | null } | null;
  _count: { comments: number };
}

interface Department { id: string; name: string; nameAr?: string | null }

export default function InternalTasksPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const {
    data: tasks, loading, search, setSearch, setFilter,
    page, setPage, meta, deleteTarget, setDeleteTarget, handleDelete, refresh,
  } = useListPage<InternalTask>({
    endpoint: '/api/internal-tasks',
    deleteSuccessMsg: t('messages.deleteSuccess', { entity: t('internalTasks.title') }),
    deleteErrorMsg: t('common.error'),
    fetchErrorMsg: t('common.error'),
  });

  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected, isSomeSelected, selectedCount, isSelected } = useSelection(tasks);

  useEffect(() => {
    fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d.data || [])).catch(() => {});
  }, []);

  const handleBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/internal-tasks/${id}`, { method: 'DELETE' })));
      toast.success(t('messages.deleteSuccess', { entity: t('internalTasks.title') }));
      clearSelection();
      setBulkDeleteOpen(false);
      refresh();
    } catch { toast.error(t('common.error')); }
  };

  const fmtDate = (d: string) => formatDate(d, locale);

  const getStatusLabel = (s: string) => ({
    OPEN: t('internalTasks.statusOpen'),
    IN_PROGRESS: t('internalTasks.statusInProgress'),
    SUBMITTED: t('internalTasks.statusSubmitted'),
    APPROVED: t('internalTasks.statusApproved'),
    REJECTED: t('internalTasks.statusRejected'),
    DONE: t('internalTasks.statusDone'),
  }[s] ?? s);

  const getPriorityLabel = (p: string) => ({
    LOW: t('internalTasks.priorityLow'),
    MEDIUM: t('internalTasks.priorityMedium'),
    HIGH: t('internalTasks.priorityHigh'),
    URGENT: t('internalTasks.priorityUrgent'),
  }[p] ?? p);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={`size-3.5 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
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
                    <SelectItem value="all">{t('internalTasks.allStatuses')}</SelectItem>
                    <SelectItem value="OPEN">{t('internalTasks.statusOpen')}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t('internalTasks.statusInProgress')}</SelectItem>
                    <SelectItem value="SUBMITTED">{t('internalTasks.statusSubmitted')}</SelectItem>
                    <SelectItem value="APPROVED">{t('internalTasks.statusApproved')}</SelectItem>
                    <SelectItem value="REJECTED">{t('internalTasks.statusRejected')}</SelectItem>
                    <SelectItem value="DONE">{t('internalTasks.statusDone')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all" onValueChange={(v) => setFilter('priority', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('internalTasks.priority')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('internalTasks.allPriorities')}</SelectItem>
                    <SelectItem value="LOW">{t('internalTasks.priorityLow')}</SelectItem>
                    <SelectItem value="MEDIUM">{t('internalTasks.priorityMedium')}</SelectItem>
                    <SelectItem value="HIGH">{t('internalTasks.priorityHigh')}</SelectItem>
                    <SelectItem value="URGENT">{t('internalTasks.priorityUrgent')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all" onValueChange={(v) => setFilter('departmentId', v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder={t('internalTasks.department')} /></SelectTrigger>
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
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
              <span className="text-sm font-medium text-primary">{t('common.selected', { count: selectedCount })}</span>
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

          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : tasks.length === 0 ? (
            <Card className="shadow-premium">
              <CardContent className="p-0">
                <EmptyState title={t('internalTasks.noTasks')} />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {tasks.map((task) => (
                  <Card key={task.id} className="shadow-premium">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <Checkbox checked={isSelected(task.id)} onCheckedChange={() => toggleOne(task.id)} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <Link href={`/${locale}/internal-tasks/${task.id}`} className="text-sm font-semibold text-primary hover:underline flex-1 min-w-0 truncate">{task.title}</Link>
                            <span className="shrink-0 ms-2"><StatusBadge status={task.status} label={getStatusLabel(task.status)} size="sm" /></span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                            <div className="truncate">{task.assignedTo.fullName}</div>
                            <StatusBadge status={task.priority} label={getPriorityLabel(task.priority)} size="sm" />
                            {task.dueAt && <div className="flex items-center gap-1.5"><Clock className="size-3 shrink-0" /><span>{fmtDate(task.dueAt)}</span></div>}
                            {task.rating && <div>{renderStars(task.rating.rating)}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end border-t pt-2">
                        <Link href={`/${locale}/internal-tasks/${task.id}`}><Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary"><Eye className="size-4" /></Button></Link>
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
                        <th className="px-4 py-3 w-12">
                          <Checkbox checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false} onCheckedChange={toggleAll} />
                        </th>
                        {[t('internalTasks.taskTitle'), t('internalTasks.assignee'), t('internalTasks.priority'), t('common.status'), t('internalTasks.dueDate'), t('rating.stars'), t('common.actions')].map((h, i) => (
                          <th key={i} className={`px-4 py-3 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider ${i === 0 ? 'text-start first:px-7' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tasks.map((task) => (
                        <tr key={task.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/internal-tasks/${task.id}`)}>
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={isSelected(task.id)} onCheckedChange={() => toggleOne(task.id)} />
                          </td>
                          <td className="px-7 py-4">
                            <Link href={`/${locale}/internal-tasks/${task.id}`} className="text-sm font-medium text-primary hover:underline">{task.title}</Link>
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-foreground">{task.assignedTo.fullName}</td>
                          <td className="px-4 py-4 text-center"><StatusBadge status={task.priority} label={getPriorityLabel(task.priority)} /></td>
                          <td className="px-4 py-4 text-center"><StatusBadge status={task.status} label={getStatusLabel(task.status)} /></td>
                          <td className="px-4 py-4 text-center">
                            {task.dueAt ? (
                              <div className="flex items-center justify-center gap-1.5 text-sm">
                                <Clock className="size-3.5 text-muted-foreground" />
                                <span>{fmtDate(task.dueAt)}</span>
                              </div>
                            ) : <span className="text-sm text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {task.rating ? <div className="flex justify-center">{renderStars(task.rating.rating)}</div> : <span className="text-sm text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-end" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/${locale}/internal-tasks/${task.id}`}><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Eye className="size-3.5" /></Button></Link>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(task.id)}><Trash2 className="size-3.5" /></Button>
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

      <DeleteDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} onConfirm={() => deleteTarget && handleDelete(deleteTarget)} />
    </div>
  );
}
