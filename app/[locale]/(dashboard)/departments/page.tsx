'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useSelection } from '@/hooks/use-selection';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Users,
  CheckSquare,
  UserCog,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { DualLanguageName } from '@/components/DualLanguageName';

interface Department {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  parent: { id: string; name: string; nameAr: string | null } | null;
  manager: { id: string; fullName: string } | null;
  _count: { users: number; tasks: number };
}

export default function DepartmentsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected, isSomeSelected, selectedCount, isSelected } = useSelection(departments);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/departments');

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch departments');
      }

      const data = await response.json();
      setDepartments(data.data);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || t('common.error'));
        return;
      }
      toast.success(t('messages.deleteSuccess', { entity: t('departments.title') }));
      setDeleteTarget(null);
      fetchDepartments();
    } catch { toast.error(t('common.error')); }
  };

  const handleBulkDelete = async () => {
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map((id) => fetch(`/api/departments/${id}`, { method: 'DELETE' }))
      );
      const failures = results.filter((r) => !r.ok);
      if (failures.length > 0) {
        toast.error(t('departments.cannotDelete'));
      } else {
        toast.success(t('messages.deleteSuccess', { entity: t('departments.title') }));
      }
      clearSelection();
      setBulkDeleteOpen(false);
      fetchDepartments();
    } catch { toast.error(t('common.error')); }
  };

  const filteredDepartments = departments.filter((dept) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      dept.name.toLowerCase().includes(q) ||
      (dept.nameAr && dept.nameAr.includes(q)) ||
      (dept.manager?.fullName.toLowerCase().includes(q))
    );
  });

  const getDeptName = (dept: { name: string; nameAr: string | null }) => {
    return locale === 'ar' && dept.nameAr ? dept.nameAr : dept.name;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <PageHeader
        title={t('departments.title')}
        subtitle={`${departments.length} ${t('departments.title')}`}
        icon={Building2}
        actions={
          <Link href={`/${locale}/departments/new`}>
            <Button className="btn-premium">
              <Plus className="size-4 me-2" />
              {t('departments.create')}
            </Button>
          </Link>
        }
      />

      {/* Search */}
      <Card className="shadow-premium mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-primary" />
            {t('common.search')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
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
        <TableSkeleton rows={4} columns={5} />
      ) : filteredDepartments.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t('common.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filteredDepartments.map((dept) => (
            <Card key={dept.id} className="shadow-premium">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <DualLanguageName name={getDeptName(dept)} nameAr={locale === 'ar' ? dept.name : dept.nameAr} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                  {dept.manager && (
                    <div className="flex items-center gap-1.5">
                      <UserCog className="size-3 shrink-0" />
                      <span className="truncate">{dept.manager.fullName}</span>
                    </div>
                  )}
                  {dept.parent && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="size-3 shrink-0" />
                      <span className="truncate">{getDeptName(dept.parent)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3 shrink-0" />
                    <span>{dept._count.users} {t('departments.members')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="size-3 shrink-0" />
                    <span>{dept._count.tasks} {t('tasks.title')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 border-t pt-2">
                  <Link href={`/${locale}/departments/${dept.id}/edit`}>
                    <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                      <Pencil className="size-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(dept.id)}>
                    <Trash2 className="size-4" />
                  </Button>
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
                  <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Building2 className="size-3" />
                      {t('departments.name')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('departments.parent')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <UserCog className="size-3" />
                      {t('departments.manager')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="size-3" />
                      {t('departments.members')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      <CheckSquare className="size-3" />
                      {t('tasks.title')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox checked={isSelected(dept.id)} onCheckedChange={() => toggleOne(dept.id)} />
                    </td>
                    <td className="px-6 py-4">
                      <DualLanguageName name={getDeptName(dept)} nameAr={locale === 'ar' ? dept.name : dept.nameAr} />
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-foreground">
                      {dept.parent ? (
                        getDeptName(dept.parent)
                      ) : (
                        <span className="text-muted-foreground">{t('departments.noParent')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {dept.manager ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="size-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {dept.manager.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-foreground">{dept.manager.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                        {dept._count.users}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="secondary">
                        {dept._count.tasks}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/${locale}/departments/${dept.id}/edit`}>
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                            <Pencil className="size-3.5" />
                          </Button>
                        </Link>
                        <AlertDialog open={deleteTarget === dept.id} onOpenChange={(open) => setDeleteTarget(open ? dept.id : null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(dept.id)} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}
    </div>
  );
}
