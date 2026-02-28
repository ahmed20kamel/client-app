'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useSelection } from '@/hooks/use-selection';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  UserCog,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Shield,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'DISABLED';
  lastLoginAt: string | null;
  createdAt: string;
  role: {
    id: string;
    name: string;
  } | null;
}

interface UsersResponse {
  data: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function UsersPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const { selectedIds, toggleOne, toggleAll, clearSelection, isAllSelected, isSomeSelected, selectedCount, isSelected } = useSelection(users);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const response = await fetch(`/api/users?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data: UsersResponse = await response.json();
      setUsers(data.data);
      setMeta(data.meta);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, status]);

  const handleDisableUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.updateSuccess', { entity: t('users.title') }));
      setDeleteTarget(null);
      fetchUsers();
    } catch { toast.error(t('common.error')); }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map((id) => fetch(`/api/users/${id}`, { method: 'DELETE' })));
      toast.success(t('messages.updateSuccess', { entity: t('users.title') }));
      clearSelection();
      setBulkDeleteOpen(false);
      fetchUsers();
    } catch { toast.error(t('common.error')); }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('users.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {meta.total} {t('users.title')}
          </p>
        </div>
        <Link href={`/${locale}/users/new`}>
          <Button className="btn-premium">
            <Plus className="size-4 me-2" />
            {t('users.create')}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="shadow-premium mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-primary" />
            {t('common.search')} & {t('common.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="ps-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={status} onValueChange={(val) => { setStatus(val === 'ALL' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.status')}</SelectItem>
                <SelectItem value="ACTIVE">{t('users.statusActive')}</SelectItem>
                <SelectItem value="DISABLED">{t('users.statusDisabled')}</SelectItem>
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
        <Card className="shadow-premium">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : users.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t('common.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-6 py-3 w-12">
                      <Checkbox checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false} onCheckedChange={toggleAll} />
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('users.fullName')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {t('common.email')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Shield className="size-3" />
                        {t('users.role')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {t('users.lastLogin')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <Checkbox checked={isSelected(user.id)} onCheckedChange={() => toggleOne(user.id)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{user.fullName}</p>
                            {user.jobTitle && (
                              <p className="text-xs text-muted-foreground">{user.jobTitle}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="font-medium">
                          {user.role?.name || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={user.status === 'ACTIVE' ? 'default' : 'destructive'}
                          className={user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : ''}
                        >
                          {user.status === 'ACTIVE'
                            ? t('users.statusActive')
                            : t('users.statusDisabled')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/${locale}/users/${user.id}/edit`}>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                              <Pencil className="size-3.5" />
                            </Button>
                          </Link>
                          {user.status === 'ACTIVE' && (
                            <AlertDialog open={deleteTarget === user.id} onOpenChange={(open) => setDeleteTarget(open ? user.id : null)}>
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
                                  <AlertDialogAction onClick={() => handleDisableUser(user.id)} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
                {t('common.showing')} {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} {t('common.of')} {meta.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="size-4 me-1" />
                  {t('common.previous')}
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">{meta.page}</span>
                  <span className="text-sm text-muted-foreground">/</span>
                  <span className="text-sm text-muted-foreground">{meta.totalPages}</span>
                </div>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={page === meta.totalPages}
                  variant="outline"
                  size="sm"
                >
                  {t('common.next')}
                  <ChevronRight className="size-4 ms-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
