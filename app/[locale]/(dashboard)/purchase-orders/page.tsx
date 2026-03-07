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
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Truck,
  Calendar,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  total: number;
  status: string;
  expectedDate: string | null;
  supplier: {
    id: string;
    name: string;
  };
}

export default function PurchaseOrdersPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
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

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: t('purchaseOrders.statusDraft'),
      SENT: t('purchaseOrders.statusSent'),
      CONFIRMED: t('purchaseOrders.statusConfirmed'),
      PARTIALLY_RECEIVED: t('purchaseOrders.statusPartiallyReceived'),
      RECEIVED: t('purchaseOrders.statusReceived'),
      CANCELLED: t('purchaseOrders.statusCancelled'),
    };
    return map[s] || s;
  };

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      if (search) queryParams.set('search', search);
      if (status) queryParams.set('status', status);

      const response = await fetch(`/api/purchase-orders?${queryParams.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch purchase orders');
      }

      const data = await response.json();
      setPurchaseOrders(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status]);

  const handleDeletePO = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('purchaseOrders.title') }));
      setDeleteTarget(null);
      fetchPurchaseOrders();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        title={t('purchaseOrders.title')}
        subtitle={`${meta.total} ${t('purchaseOrders.title')}`}
        icon={ShoppingCart}
        actions={
          <Link href={`/${locale}/purchase-orders/new`}>
            <Button className="btn-premium" size="sm">
              <Plus className="size-4 me-1 sm:me-2" />
              <span className="hidden sm:inline">{t('purchaseOrders.create')}</span>
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
                <SelectValue placeholder={t('purchaseOrders.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('purchaseOrders.allStatuses')}</SelectItem>
                <SelectItem value="DRAFT">{t('purchaseOrders.statusDraft')}</SelectItem>
                <SelectItem value="SENT">{t('purchaseOrders.statusSent')}</SelectItem>
                <SelectItem value="CONFIRMED">{t('purchaseOrders.statusConfirmed')}</SelectItem>
                <SelectItem value="PARTIALLY_RECEIVED">{t('purchaseOrders.statusPartiallyReceived')}</SelectItem>
                <SelectItem value="RECEIVED">{t('purchaseOrders.statusReceived')}</SelectItem>
                <SelectItem value="CANCELLED">{t('purchaseOrders.statusCancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : purchaseOrders.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t('purchaseOrders.noPurchaseOrders')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {purchaseOrders.map((po) => (
              <Card key={po.id} className="shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <Link href={`/${locale}/purchase-orders/${po.id}`} className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{po.poNumber}</p>
                    </Link>
                    <StatusBadge
                      status={po.status}
                      label={getStatusLabel(po.status)}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <Truck className="size-3 shrink-0" />
                      <span className="truncate">{po.supplier.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShoppingCart className="size-3 shrink-0" />
                      <span className="truncate">{formatAmount(po.total)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3 shrink-0" />
                      <span className="truncate">{formatDate(po.expectedDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 border-t pt-2">
                    <Link href={`/${locale}/purchase-orders/${po.id}`}>
                      <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                        <Eye className="size-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(po.id)}>
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
                      {t('purchaseOrders.poNumber')}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Truck className="size-3" />
                        {t('purchaseOrders.supplier')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('purchaseOrders.total')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="size-3" />
                        {t('purchaseOrders.expectedDate')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/purchase-orders/${po.id}`)}>
                      <td className="px-7 py-4 text-start">
                        <p className="text-sm font-bold">{po.poNumber}</p>
                      </td>
                      <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                        {po.supplier.name}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-semibold">
                        {formatAmount(po.total)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge
                          status={po.status}
                          label={getStatusLabel(po.status)}
                        />
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {formatDate(po.expectedDate)}
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/${locale}/purchase-orders/${po.id}`}>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                              <Eye className="size-3.5" />
                            </Button>
                          </Link>
                          <AlertDialog open={deleteTarget === po.id} onOpenChange={(open) => setDeleteTarget(open ? po.id : null)}>
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
                                <AlertDialogAction onClick={() => handleDeletePO(po.id)} className="bg-destructive text-white hover:bg-destructive/90">
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
                <AlertDialogAction onClick={() => deleteTarget && handleDeletePO(deleteTarget)} className="bg-destructive text-white hover:bg-destructive/90">
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
