'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
  Receipt,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertCircle,
  Send,
  Plus,
  Calendar,
  User,
  FileText,
  DollarSign,
  CreditCard,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  product: {
    id: string;
    name: string;
  } | null;
}

interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paidAt: string;
  createdBy: {
    id: string;
    fullName: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  subject: string | null;
  notes: string | null;
  terms: string | null;
  dueDate: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  createdBy: {
    id: string;
    fullName: string;
  };
  quotation: {
    id: string;
    quotationNumber: string;
  } | null;
  items: InvoiceItem[];
  payments: Payment[];
}

export default function InvoiceDetailsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingLoading, setSendingLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: t('invoices.statusDraft'),
      SENT: t('invoices.statusSent'),
      PARTIALLY_PAID: t('invoices.statusPartiallyPaid'),
      PAID: t('invoices.statusPaid'),
      OVERDUE: t('invoices.statusOverdue'),
      CANCELLED: t('invoices.statusCancelled'),
    };
    return map[s] || s;
  };

  const getMethodLabel = (m: string) => {
    const map: Record<string, string> = {
      CASH: t('invoices.methodCash'),
      BANK_TRANSFER: t('invoices.methodBankTransfer'),
      CHEQUE: t('invoices.methodCheque'),
      ONLINE: t('invoices.methodOnline'),
    };
    return map[m] || m;
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
  };

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('messages.notFound', { entity: t('invoices.title') }));
          router.push(`/${locale}/invoices`);
          return;
        }
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          router.push(`/${locale}/invoices`);
          return;
        }
        throw new Error('Failed to fetch invoice');
      }

      const { data } = await response.json();
      setInvoice(data);
    } catch {
      toast.error(t('common.error'));
      router.push(`/${locale}/invoices`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('invoices.title') }));
      router.push(`/${locale}/invoices`);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleSend = async () => {
    try {
      setSendingLoading(true);
      const response = await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || t('common.error'));
        return;
      }
      toast.success(t('invoices.sendSuccess'));
      fetchInvoice();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSendingLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error(t('invoices.invalidAmount'));
      return;
    }

    try {
      setPaymentLoading(true);
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: id,
          amount,
          method: paymentMethod,
          reference: paymentReference || null,
          notes: paymentNotes || null,
          paidAt: paymentDate || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || t('common.error'));
        return;
      }

      toast.success(t('invoices.paymentSuccess'));
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentMethod('CASH');
      setPaymentReference('');
      setPaymentNotes('');
      setPaymentDate('');
      setLoading(true);
      fetchInvoice();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setPaymentLoading(false);
    }
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

  if (!invoice) {
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

  const remainingBalance = invoice.total - invoice.paidAmount;
  const canSend = invoice.status === 'DRAFT';
  const canAddPayment = invoice.status === 'SENT' || invoice.status === 'PARTIALLY_PAID' || invoice.status === 'OVERDUE';
  const canEdit = invoice.status === 'DRAFT';

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
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/invoices`)}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
              <StatusBadge
                status={invoice.status}
                label={getStatusLabel(invoice.status)}
              />
            </div>
            {invoice.subject && (
              <p className="text-muted-foreground mt-0.5">{invoice.subject}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canSend && (
            <Button variant="outline" size="sm" onClick={handleSend} disabled={sendingLoading}>
              {sendingLoading ? <Loader2 className="size-4 me-1 animate-spin" /> : <Send className="size-4 me-1" />}
              {t('invoices.send')}
            </Button>
          )}
          {canAddPayment && (
            <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)}>
              <Plus className="size-4 me-1" />
              {t('invoices.addPayment')}
            </Button>
          )}
          {canEdit && (
            <Link href={`/${locale}/invoices/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="size-4 me-1" />
                {t('common.edit')}
              </Button>
            </Link>
          )}
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
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Invoice Info */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              {t('invoices.details')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoItem icon={Receipt} label={t('invoices.invoiceNumber')} value={invoice.invoiceNumber} />
              <InfoItem icon={User} label={t('invoices.customer')} value={invoice.customer.fullName || invoice.customer.name} />
              <InfoItem icon={Calendar} label={t('invoices.dueDate')} value={formatDate(invoice.dueDate)} />
              <InfoItem icon={Calendar} label={t('invoices.createdAt')} value={formatDate(invoice.createdAt)} />
              {invoice.sentAt && (
                <InfoItem icon={Send} label={t('invoices.sentAt')} value={formatDate(invoice.sentAt)} />
              )}
              <InfoItem icon={User} label={t('invoices.createdBy')} value={invoice.createdBy.fullName} />
            </div>

            {invoice.quotation && (
              <div className="mt-5">
                <Link href={`/${locale}/quotations/${invoice.quotation.id}`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="size-3.5" />
                  {t('invoices.sourceQuotation')}: {invoice.quotation.quotationNumber}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {t('invoices.items')} ({invoice.items.length})
            </h3>

            {/* Mobile Items */}
            <div className="md:hidden space-y-3">
              {invoice.items.map((item) => (
                <div key={item.id} className="border border-border/60 rounded-xl p-4">
                  <p className="text-sm font-bold mb-1">{item.description}</p>
                  {item.product && (
                    <p className="text-xs text-muted-foreground mb-2">{item.product.name}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>{t('invoices.quantity')}: {item.quantity}</div>
                    <div>{t('invoices.unitPrice')}: {formatCurrency(item.unitPrice)}</div>
                    {item.discount > 0 && <div>{t('invoices.discount')}: {item.discount}%</div>}
                    <div className="font-bold text-foreground">{t('invoices.lineTotal')}: {formatCurrency(item.total)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Items Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('invoices.description')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('invoices.quantity')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('invoices.unitPrice')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('invoices.discount')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('invoices.lineTotal')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-7 py-4 text-start">
                        <p className="text-sm font-bold">{item.description}</p>
                        {item.product && (
                          <p className="text-xs text-muted-foreground">{item.product.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {item.discount > 0 ? `${item.discount}%` : '-'}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-medium">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="mt-6 flex justify-end">
              <div className="w-full md:w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('invoices.subtotal')}</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('invoices.discountPercent')} ({invoice.discountPercent}%)</span>
                    <span className="font-medium">-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('invoices.taxPercent')} ({invoice.taxPercent}%)</span>
                  <span className="font-medium">+{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-base font-bold">
                  <span>{t('invoices.total')}</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />
              {t('invoices.paymentSummary')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-xl bg-muted/30 border border-border/50 p-5 text-center">
                <p className="text-[11px] text-muted-foreground font-medium mb-1">{t('invoices.total')}</p>
                <p className="text-xl font-bold">{formatCurrency(invoice.total)}</p>
              </div>
              <div className="rounded-xl bg-muted/30 border border-border/50 p-5 text-center">
                <p className="text-[11px] text-muted-foreground font-medium mb-1">{t('invoices.paid')}</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(invoice.paidAmount)}</p>
              </div>
              <div className={`rounded-xl border p-5 text-center ${remainingBalance > 0 && (invoice.status === 'OVERDUE') ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-border/50'}`}>
                <p className="text-[11px] text-muted-foreground font-medium mb-1">{t('invoices.balance')}</p>
                <p className={`text-xl font-bold ${remainingBalance > 0 && invoice.status === 'OVERDUE' ? 'text-destructive' : ''}`}>
                  {formatCurrency(remainingBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inline Payment Form */}
        {showPaymentForm && (
          <Card className="shadow-premium border-primary/30">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                {t('invoices.addPayment')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <DollarSign className="size-3.5" />
                    {t('invoices.paymentAmount')} *
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    max={remainingBalance}
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`${t('invoices.maxAmount')}: ${formatCurrency(remainingBalance)}`}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <CreditCard className="size-3.5" />
                    {t('invoices.paymentMethod')} *
                  </label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">{t('invoices.methodCash')}</SelectItem>
                      <SelectItem value="BANK_TRANSFER">{t('invoices.methodBankTransfer')}</SelectItem>
                      <SelectItem value="CHEQUE">{t('invoices.methodCheque')}</SelectItem>
                      <SelectItem value="ONLINE">{t('invoices.methodOnline')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <FileText className="size-3.5" />
                    {t('invoices.paymentReference')}
                  </label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={t('invoices.paymentReference')}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <Calendar className="size-3.5" />
                    {t('invoices.paymentDate')}
                  </label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                    <FileText className="size-3.5" />
                    {t('common.notes')}
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder={t('common.notes')}
                    rows={2}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-5">
                <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="button" className="btn-premium" disabled={paymentLoading} onClick={handleAddPayment}>
                  {paymentLoading ? (
                    <Loader2 className="size-4 me-2 animate-spin" />
                  ) : (
                    <DollarSign className="size-4 me-2" />
                  )}
                  {t('invoices.recordPayment')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payments List */}
        {invoice.payments.length > 0 && (
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                {t('invoices.payments')} ({invoice.payments.length})
              </h3>

              {/* Mobile Payment Cards */}
              <div className="md:hidden space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="border border-border/60 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-bold">{payment.paymentNumber}</p>
                      <p className="text-sm font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>{t('invoices.paymentMethod')}: {getMethodLabel(payment.method)}</div>
                      <div>{t('invoices.paymentDate')}: {formatDate(payment.paidAt)}</div>
                      {payment.reference && <div>{t('invoices.paymentReference')}: {payment.reference}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Payments Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('invoices.paymentNumber')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('invoices.paymentAmount')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('invoices.paymentMethod')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('invoices.paymentDate')}
                      </th>
                      <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('invoices.paymentReference')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-7 py-4 text-start text-sm font-bold">
                          {payment.paymentNumber}
                        </td>
                        <td className="px-4 py-4 text-center text-sm font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                          {getMethodLabel(payment.method)}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                          {formatDate(payment.paidAt)}
                        </td>
                        <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                          {payment.reference || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              {invoice.notes && (
                <div className="mb-6">
                  <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    {t('common.notes')}
                  </h3>
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{invoice.notes}</p>
                  </div>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    {t('invoices.terms')}
                  </h3>
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{invoice.terms}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
