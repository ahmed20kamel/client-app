'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  FileText,
  User,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertCircle,
  Calendar,
  Send,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  DollarSign,
  Hash,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  product: {
    id: string;
    name: string;
  } | null;
}

interface LinkedInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  subject: string | null;
  status: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    fullName: string;
  };
  items: QuotationItem[];
  invoices?: LinkedInvoice[];
}

export default function QuotationDetailsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: t('quotations.statusDraft'),
      SENT: t('quotations.statusSent'),
      APPROVED: t('quotations.statusApproved'),
      REJECTED: t('quotations.statusRejected'),
      EXPIRED: t('quotations.statusExpired'),
      CONVERTED: t('quotations.statusConverted'),
    };
    return map[s] || s;
  };

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const response = await fetch(`/api/quotations/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast.error(t('messages.notFound', { entity: t('quotations.title') }));
            router.push(`/${locale}/quotations`);
            return;
          }
          if (response.status === 403) {
            toast.error(t('messages.unauthorized'));
            router.push(`/${locale}/quotations`);
            return;
          }
          throw new Error('Failed to fetch quotation');
        }

        const { data } = await response.json();
        setQuotation(data);
      } catch {
        toast.error(t('common.error'));
        router.push(`/${locale}/quotations`);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [id, t, router, locale]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('quotations.title') }));
      router.push(`/${locale}/quotations`);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleStatusAction = async (action: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });

      if (!response.ok) throw new Error('Failed');

      toast.success(t('messages.updateSuccess', { entity: t('quotations.title') }));
      const { data } = await response.json();
      setQuotation(data);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/quotations/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed');

      toast.success(t('quotations.convertedSuccess'));
      const { data } = await response.json();
      if (data?.id) {
        router.push(`/${locale}/invoices/${data.id}`);
      } else {
        router.push(`/${locale}/quotations`);
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  if (loading) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </div>
        </div>
      </div>
    );
  }

  const InfoItem = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | number | null | undefined }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/quotations`)}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{quotation.quotationNumber}</h1>
              <StatusBadge
                status={quotation.status}
                label={getStatusLabel(quotation.status)}
              />
            </div>
            {quotation.subject && (
              <p className="text-muted-foreground mt-0.5">{quotation.subject}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status-based actions */}
          {quotation.status === 'DRAFT' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusAction('SENT')} disabled={actionLoading}>
                <Send className="size-4 me-1" />
                {t('quotations.send')}
              </Button>
              <Link href={`/${locale}/quotations/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="size-4 me-1" />
                  {t('common.edit')}
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4 me-1" />
                    {t('common.delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                      {t('common.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {quotation.status === 'SENT' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusAction('APPROVED')} disabled={actionLoading} className="text-emerald-600 hover:text-emerald-700">
                <CheckCircle className="size-4 me-1" />
                {t('quotations.approve')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleStatusAction('REJECTED')} disabled={actionLoading} className="text-destructive hover:text-destructive">
                <XCircle className="size-4 me-1" />
                {t('quotations.reject')}
              </Button>
            </>
          )}
          {quotation.status === 'APPROVED' && (
            <Button variant="outline" size="sm" onClick={handleConvertToInvoice} disabled={actionLoading}>
              <ArrowRightLeft className="size-4 me-1" />
              {t('quotations.convertToInvoice')}
            </Button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Quotation Info */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {t('quotations.details')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoItem icon={Hash} label={t('quotations.quotationNumber')} value={quotation.quotationNumber} />
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                  <User className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium">{t('quotations.customer')}</p>
                  <Link href={`/${locale}/customers/${quotation.customer.id}`} className="text-sm font-bold text-primary hover:underline">
                    {quotation.customer.fullName}
                  </Link>
                </div>
              </div>
              <InfoItem icon={Calendar} label={t('common.date')} value={formatDate(quotation.createdAt)} />
              <InfoItem icon={Calendar} label={t('quotations.validUntil')} value={quotation.validUntil ? formatDate(quotation.validUntil) : null} />
              <InfoItem icon={DollarSign} label={t('quotations.total')} value={formatCurrency(quotation.total)} />
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {t('quotations.items')} ({quotation.items.length})
            </h3>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {quotation.items.map((item) => (
                <div key={item.id} className="border border-border/60 rounded-xl p-4">
                  <p className="text-sm font-bold mb-1">{item.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">{t('quotations.quantity')}:</span> {item.quantity}
                    </div>
                    <div>
                      <span className="font-medium">{t('quotations.unitPrice')}:</span> {formatCurrency(item.unitPrice)}
                    </div>
                    <div>
                      <span className="font-medium">{t('quotations.discount')}:</span> {item.discount}%
                    </div>
                    <div>
                      <span className="font-medium">{t('quotations.lineTotal')}:</span> {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('quotations.description')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('quotations.quantity')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('quotations.unitPrice')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('quotations.discount')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('quotations.lineTotal')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quotation.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-7 py-4 text-start text-sm font-bold">
                        {item.description}
                        {item.product && (
                          <p className="text-xs text-muted-foreground font-normal">{item.product.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {item.discount}%
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 border-t pt-4 max-w-sm ms-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('quotations.subtotal')}</span>
                <span className="font-medium">{formatCurrency(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('quotations.discount')} ({quotation.discountPercent}%)</span>
                <span className="font-medium text-destructive">-{formatCurrency(quotation.discountAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('quotations.tax')} ({quotation.taxPercent}%)</span>
                <span className="font-medium">+{formatCurrency(quotation.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>{t('quotations.total')}</span>
                <span>{formatCurrency(quotation.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Invoices */}
        {quotation.invoices && quotation.invoices.length > 0 && (
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
                <DollarSign className="size-4 text-primary" />
                {t('quotations.linkedInvoices')} ({quotation.invoices.length})
              </h3>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {quotation.invoices.map((invoice) => (
                  <Link key={invoice.id} href={`/${locale}/invoices/${invoice.id}`}>
                    <div className="border border-border/60 rounded-xl p-4 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">{invoice.invoiceNumber}</p>
                        <StatusBadge status={invoice.status} label={invoice.status} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatCurrency(invoice.total)}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('quotations.invoiceNumber')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('common.status')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('quotations.total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quotation.invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/invoices/${invoice.id}`)}>
                        <td className="px-7 py-4 text-start text-sm font-bold text-primary">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <StatusBadge status={invoice.status} label={invoice.status} />
                        </td>
                        <td className="px-4 py-4 text-center text-sm font-medium">
                          {formatCurrency(invoice.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {quotation.notes && (
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                {t('common.notes')}
              </h3>
              <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{quotation.notes}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Terms */}
        {quotation.terms && (
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                {t('quotations.terms')}
              </h3>
              <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{quotation.terms}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
