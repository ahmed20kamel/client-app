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
  CreditCard,
  Plus,
  Search,
  Filter,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Hash,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  method: string;
  paidAt: string;
  reference: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    customer: {
      id: string;
      fullName: string;
    };
  };
}

export default function PaymentsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const methodLabels: Record<string, string> = {
    CASH: t('payments.methodCash'),
    BANK_TRANSFER: t('payments.methodBankTransfer'),
    CHEQUE: t('payments.methodCheque'),
    ONLINE: t('payments.methodOnline'),
  };

  const getMethodLabel = (m: string) => methodLabels[m] || m;

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      if (search) queryParams.set('search', search);
      if (method) queryParams.set('method', method);

      const response = await fetch(`/api/payments?${queryParams.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, method]);

  const handleDeletePayment = async (id: string) => {
    try {
      const response = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('payments.title') }));
      setDeleteTarget(null);
      fetchPayments();
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        title={t('payments.title')}
        subtitle={`${meta.total} ${t('payments.title')}`}
        icon={CreditCard}
        actions={
          <Link href={`/${locale}/payments/new`}>
            <Button className="btn-premium" size="sm">
              <Plus className="size-4 me-1 sm:me-2" />
              <span className="hidden sm:inline">{t('payments.create')}</span>
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

            {/* Method Filter */}
            <Select value={method} onValueChange={(val) => { setMethod(val === 'ALL' ? '' : val); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('payments.allMethods')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('payments.allMethods')}</SelectItem>
                <SelectItem value="CASH">{t('payments.methodCash')}</SelectItem>
                <SelectItem value="BANK_TRANSFER">{t('payments.methodBankTransfer')}</SelectItem>
                <SelectItem value="CHEQUE">{t('payments.methodCheque')}</SelectItem>
                <SelectItem value="ONLINE">{t('payments.methodOnline')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : payments.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t('payments.noPayments')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="shadow-premium">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{payment.paymentNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">{payment.invoice.invoiceNumber}</p>
                    </div>
                    <StatusBadge
                      status={payment.method}
                      label={getMethodLabel(payment.method)}
                      size="sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <User className="size-3 shrink-0" />
                      <span className="truncate">{payment.invoice.customer.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="size-3 shrink-0" />
                      <span className="truncate">{formatAmount(payment.amount)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3 shrink-0" />
                      <span className="truncate">{formatDate(payment.paidAt)}</span>
                    </div>
                    {payment.reference && (
                      <div className="flex items-center gap-1.5">
                        <Hash className="size-3 shrink-0" />
                        <span className="truncate">{payment.reference}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1 border-t pt-2">
                    <Link href={`/${locale}/payments/${payment.id}`}>
                      <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                        <Eye className="size-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(payment.id)}>
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
                      {t('payments.paymentNumber')}
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <FileText className="size-3" />
                        {t('payments.invoice')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <User className="size-3" />
                        {t('payments.customer')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('payments.amount')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('payments.method')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="size-3" />
                        {t('payments.paidAt')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('payments.reference')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/payments/${payment.id}`)}>
                      <td className="px-7 py-4 text-start">
                        <p className="text-sm font-bold">{payment.paymentNumber}</p>
                      </td>
                      <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                        {payment.invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                        {payment.invoice.customer.fullName}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-semibold">
                        {formatAmount(payment.amount)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <StatusBadge
                          status={payment.method}
                          label={getMethodLabel(payment.method)}
                        />
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {formatDate(payment.paidAt)}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {payment.reference || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/${locale}/payments/${payment.id}`}>
                            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                              <Eye className="size-3.5" />
                            </Button>
                          </Link>
                          <AlertDialog open={deleteTarget === payment.id} onOpenChange={(open) => setDeleteTarget(open ? payment.id : null)}>
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
                                <AlertDialogAction onClick={() => handleDeletePayment(payment.id)} className="bg-destructive text-white hover:bg-destructive/90">
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
                <AlertDialogAction onClick={() => deleteTarget && handleDeletePayment(deleteTarget)} className="bg-destructive text-white hover:bg-destructive/90">
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
