'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CreditCard,
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Calendar,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  customer: {
    id: string;
    fullName: string;
  };
}

export default function CreatePaymentPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [isLoading, setIsLoading] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch('/api/invoices?status=SENT,PARTIALLY_PAID&limit=200');
        if (!response.ok) throw new Error('Failed to fetch invoices');
        const data = await response.json();
        setInvoices(data.data || []);
      } catch {
        toast.error(t('common.error'));
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const remainingBalance = selectedInvoice
    ? selectedInvoice.total - selectedInvoice.paidAmount
    : 0;
  const amountNum = parseFloat(amount) || 0;
  const isOverpaying = amountNum > remainingBalance && remainingBalance > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInvoiceId) {
      toast.error(t('payments.selectInvoice'));
      return;
    }
    if (!amount || amountNum <= 0) {
      toast.error(t('payments.enterAmount'));
      return;
    }
    if (!method) {
      toast.error(t('payments.selectMethod'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: amountNum,
          method,
          reference: reference || null,
          notes: notes || null,
          paidAt: paidAt || null,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || 'Failed to create payment');
      }

      toast.success(t('messages.createSuccess', { entity: t('payments.title') }));
      router.push(`/${locale}/payments`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (val: number) => {
    return val.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <PageHeader
        title={t('payments.create')}
        icon={CreditCard}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/payments`)}>
            <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-5">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-premium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" />
              {t('payments.details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Invoice Select */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <FileText className="size-3.5" />
                  {t('payments.invoice')} *
                </label>
                <Select
                  value={selectedInvoiceId}
                  onValueChange={setSelectedInvoiceId}
                  disabled={loadingInvoices}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingInvoices ? t('common.loading') : t('payments.selectInvoice')} />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} - {inv.customer.fullName} ({t('payments.balance')}: {formatAmount(inv.total - inv.paidAmount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Remaining Balance Display */}
              {selectedInvoice && (
                <div className="md:col-span-2">
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs font-medium">{t('payments.invoiceTotal')}</p>
                        <p className="font-bold">{formatAmount(selectedInvoice.total)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-medium">{t('payments.paidSoFar')}</p>
                        <p className="font-bold">{formatAmount(selectedInvoice.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-medium">{t('payments.remainingBalance')}</p>
                        <p className="font-bold text-primary">{formatAmount(remainingBalance)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <CreditCard className="size-3.5" />
                  {t('payments.amount')} *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                {isOverpaying && (
                  <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>{t('payments.overpayWarning')}</span>
                  </div>
                )}
              </div>

              {/* Method */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  {t('payments.method')} *
                </label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('payments.selectMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{t('payments.methodCash')}</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{t('payments.methodBankTransfer')}</SelectItem>
                    <SelectItem value="CHEQUE">{t('payments.methodCheque')}</SelectItem>
                    <SelectItem value="ONLINE">{t('payments.methodOnline')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reference */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <Hash className="size-3.5" />
                  {t('payments.reference')}
                </label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={t('payments.reference')}
                />
              </div>

              {/* Paid At */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <Calendar className="size-3.5" />
                  {t('payments.paidAt')}
                </label>
                <Input
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-1.5 text-sm font-medium mb-2">
                  <FileText className="size-3.5" />
                  {t('common.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('common.notes')}
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/payments`)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" className="btn-premium" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="size-4 me-2 animate-spin" />
            ) : (
              <Save className="size-4 me-2" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </form>
      </div>
      </div>
    </div>
  );
}
