'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Receipt, ArrowLeft, Save, Loader2, Package, Calculator, Truck, FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface QuotationItem {
  id: string; description: string; quantity: number; length: number | null;
  linearMeters: number | null; size: string | null; unit: string | null;
  unitPrice: number; discount: number; total: number;
  product: { id: string; name: string } | null;
}
interface Quotation {
  id: string; quotationNumber: string; status: string;
  customerId: string | null;
  clientId: string | null;
  engineerName: string | null; mobileNumber: string | null; projectName: string | null;
  lpoNumber: string | null; paymentTerms: string | null;
  notes: string | null; terms: string | null;
  subtotal: number; taxPercent: number; taxAmount: number; deliveryCharges: number; total: number;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string; trn: string | null } | null;
  items: QuotationItem[];
}

export default function NewTaxInvoicePage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const quotationId = searchParams.get('quotationId');

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(!!quotationId);
  const [saving, setSaving] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  useEffect(() => {
    if (!quotationId) { setLoading(false); return; }
    fetch(`/api/quotations/${quotationId}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (data.status !== 'CONFIRMED') {
          toast.error(t('taxInvoices.mustBeConfirmed'));
          router.push(`/${locale}/quotations/${quotationId}`);
          return;
        }
        setQuotation(data);
        setNotes(data.notes || '');
        setTerms(data.terms || '');
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [quotationId, locale, router, t]);

  const handleSave = async () => {
    if (!quotation) { toast.error(t('taxInvoices.selectQuotation')); return; }
    if (!invoiceNumber.trim()) { toast.error(t('taxInvoices.invoiceNumberRequired')); return; }
    setSaving(true);
    try {
      const items = quotation.items.map((item, i) => ({
        productId: item.product?.id || null,
        description: item.description,
        quantity: item.quantity,
        length: item.length,
        linearMeters: item.linearMeters,
        size: item.size,
        unit: item.unit,
        unitPrice: item.unitPrice,
        total: item.total,
        sortOrder: i,
      }));

      const res = await fetch('/api/tax-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: quotation.id,
          invoiceNumber: invoiceNumber.trim(),
          customerId: quotation.customerId || quotation.customer?.id,
          engineerName: quotation.engineerName,
          mobileNumber: quotation.mobileNumber,
          projectName: quotation.projectName,
          lpoNumber: quotation.lpoNumber,
          paymentTerms: quotation.paymentTerms,
          notes: notes || null,
          terms: terms || null,
          taxPercent: quotation.taxPercent,
          deliveryCharges: quotation.deliveryCharges,
          items,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { data } = await res.json();
      toast.success(t('messages.createSuccess', { entity: t('taxInvoices.title') }));
      router.push(`/${locale}/tax-invoices/${data.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm p-16 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    </div>
  );

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('taxInvoices.create')}
          icon={Receipt}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />{t('common.back')}
            </Button>
          }
        />

        <div className="p-5 space-y-6">
          {/* Invoice Number — manual entry */}
          <Card className="shadow-premium border-primary/20">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Receipt className="size-5 text-primary shrink-0" />
                <div className="flex-1">
                  <label className="text-sm font-semibold block mb-1.5">
                    {t('taxInvoices.invoiceNumber')} <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder={t('taxInvoices.invoiceNumberPlaceholder')}
                    className="w-full max-w-xs border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Source Quotation Info */}
          {quotation && (
            <Card className="shadow-premium border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="pt-5">
                <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
                  <FileText className="size-4 text-emerald-600" />
                  {t('taxInvoices.sourceQuotation')}: <span className="text-emerald-600">{quotation.quotationNumber}</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-[11px] text-muted-foreground font-medium">{t('quotations.customer')}</p><p className="font-bold">{quotation.client?.companyName || quotation.customer?.fullName || '—'}</p></div>
                  <div><p className="text-[11px] text-muted-foreground font-medium">{t('quotations.projectName')}</p><p className="font-bold">{quotation.projectName || '—'}</p></div>
                  <div><p className="text-[11px] text-muted-foreground font-medium">{t('quotations.lpoNumber')}</p><p className="font-bold">{quotation.lpoNumber || '—'}</p></div>
                  <div><p className="text-[11px] text-muted-foreground font-medium">{t('quotations.paymentTerms')}</p><p className="font-bold">{quotation.paymentTerms || '—'}</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items Preview */}
          {quotation && (
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="size-4 text-primary" />{t('quotations.items')} ({quotation.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.description')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.size')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.unit')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.quantity')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.totalLM')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.unitPrice')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.lineTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotation.items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/10">
                          <td className="px-4 py-3 text-sm font-medium">{item.description}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.size || '—'}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.unit || '—'}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.quantity}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">
                            {item.unit === 'LM' && item.linearMeters ? `${item.linearMeters.toFixed(2)} LM` : '—'}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{fmt(item.unitPrice)}</td>
                          <td className="px-3 py-3 text-center text-sm font-medium">{fmt(item.total)} AED</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 border-t pt-4 max-w-sm ms-auto space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('quotations.subtotal')}</span>
                    <span className="font-medium">{fmt(quotation.subtotal)} AED</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('quotations.tax')} ({quotation.taxPercent}% VAT)</span>
                    <span className="font-medium">+{fmt(quotation.taxAmount)} AED</span>
                  </div>
                  {quotation.deliveryCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><Truck className="size-3" />{t('quotations.deliveryCharges')}</span>
                      <span className="font-medium">+{fmt(quotation.deliveryCharges)} AED</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t pt-2">
                    <span>{t('quotations.total')}</span>
                    <span>{fmt(quotation.total)} AED</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes & Terms */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="size-4 text-primary" />{t('quotations.notesAndTerms')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">{t('common.notes')}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">{t('quotations.terms')}</label>
                <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>{t('common.cancel')}</Button>
            <Button className="btn-premium" onClick={handleSave} disabled={saving || !quotation}>
              {saving ? <Loader2 className="size-4 me-2 animate-spin" /> : <Save className="size-4 me-2" />}
              {t('taxInvoices.generateInvoice')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
