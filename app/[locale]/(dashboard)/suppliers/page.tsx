'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Truck,
  Plus,
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  AlertCircle,
  Package,
  User,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

interface Supplier {
  id: string;
  name: string;
  nameAr: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  _count: {
    products: number;
  };
}

export default function SuppliersPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      if (search) queryParams.set('search', search);
      if (status) queryParams.set('status', status);

      const response = await fetch(`/api/suppliers?${queryParams.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch suppliers');
      }

      const data = await response.json();
      setSuppliers(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  const handleDeleteSupplier = async (id: string) => {
    try {
      const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('suppliers.title') }));
      setDeleteTarget(null);
      fetchSuppliers();
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        title={t('suppliers.title')}
        subtitle={`${meta.total} ${t('suppliers.title')}`}
        icon={Truck}
        actions={
          <Link href={`/${locale}/suppliers/new`}>
            <Button className="btn-premium" size="sm">
              <Plus className="size-4 me-1 sm:me-2" />
              <span className="hidden sm:inline">{t('suppliers.create')}</span>
              <span className="sm:hidden">{t('common.new')}</span>
            </Button>
          </Link>
        }
      />

      <div className="p-5 space-y-5">
      {/* Filters */}
      <Card className="shadow-premium mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-primary" />
            {t('common.search')} {locale === 'ar' ? 'و' : '&'} {t('common.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
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
                <SelectValue placeholder={t('suppliers.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('suppliers.allStatuses')}</SelectItem>
                <SelectItem value="ACTIVE">{t('suppliers.statusActive')}</SelectItem>
                <SelectItem value="INACTIVE">{t('suppliers.statusInactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : suppliers.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t('suppliers.noSuppliers')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {suppliers.map((supplier) => (
              <Card key={supplier.id} className="shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Link href={`/${locale}/suppliers/${supplier.id}`} className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{supplier.name}</p>
                      {supplier.nameAr && (
                        <p className="text-xs text-muted-foreground truncate" dir="rtl">{supplier.nameAr}</p>
                      )}
                    </Link>
                    <StatusBadge
                      status={supplier.status}
                      label={supplier.status === 'ACTIVE' ? t('suppliers.statusActive') : t('suppliers.statusInactive')}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                    {supplier.contactPerson && (
                      <div className="flex items-center gap-1.5">
                        <User className="size-3 shrink-0" />
                        <span className="truncate">{supplier.contactPerson}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="size-3 shrink-0" />
                        <span className="truncate">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="size-3 shrink-0" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Package className="size-3 shrink-0" />
                      <span>{supplier._count.products}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 border-t pt-2">
                    <Link href={`/${locale}/suppliers/${supplier.id}`}>
                      <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                        <Eye className="size-4" />
                      </Button>
                    </Link>
                    <Link href={`/${locale}/suppliers/${supplier.id}/edit`}>
                      <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                        <Pencil className="size-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(supplier.id)}>
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
                    <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('suppliers.supplierName')}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('suppliers.contactPerson')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Phone className="size-3" />
                        {t('common.phone')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Mail className="size-3" />
                        {t('common.email')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="size-3" />
                        {t('suppliers.linkedProducts')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/suppliers/${supplier.id}`)}>
                      <td className="px-7 py-4 text-start">
                        <p className="text-sm font-bold">{supplier.name}</p>
                        {supplier.nameAr && (
                          <p className="text-xs text-muted-foreground" dir="rtl">{supplier.nameAr}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                        {supplier.contactPerson || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {supplier.phone || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {supplier.email || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {supplier._count.products}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge
                          status={supplier.status}
                          label={supplier.status === 'ACTIVE' ? t('suppliers.statusActive') : t('suppliers.statusInactive')}
                        />
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/${locale}/suppliers/${supplier.id}`}>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                              <Eye className="size-3.5" />
                            </Button>
                          </Link>
                          <Link href={`/${locale}/suppliers/${supplier.id}/edit`}>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                              <Pencil className="size-3.5" />
                            </Button>
                          </Link>
                          <AlertDialog open={deleteTarget === supplier.id} onOpenChange={(open) => setDeleteTarget(open ? supplier.id : null)}>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                                <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSupplier(supplier.id)} className="bg-destructive text-white hover:bg-destructive/90">
                                  {t('common.delete')}
                                </AlertDialogAction>
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

          {/* Delete Dialog for mobile */}
          <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteTarget && handleDeleteSupplier(deleteTarget)} className="bg-destructive text-white hover:bg-destructive/90">
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
                  <ChevronLeft className="size-4 me-1 rtl:-scale-x-100" />
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
                  <ChevronRight className="size-4 ms-1 rtl:-scale-x-100" />
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
