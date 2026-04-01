'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Package2, ArrowLeft, Save, Loader2, User, Package, FileText, PenLine } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface InvoiceItem {
  id: string; description: string; quantity: number; length: number | null;
  linearMeters: number | null; size: string | null; unit: string | null;
  unitPrice: number; total: number;
  product: { id: string; name: string } | null;
}
interface TaxInvoice {
  id: string; invoiceNumber: string; lpoNumber: string | null; paymentTerms: string | null;
  engineerName: string | null; mobileNumber: string | null; projectName: string | null;
  customer: { id: string; fullName: string };
  quotation: { id: string; quotationNumber: string } | null;
  items: InvoiceItem[];
}

export default function NewDeliveryNotePage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const taxInvoiceId = searchParams.get('taxInvoiceId');

  const [invoice, setInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(!!taxInvoiceId);
  const [saving, setSaving] = useState(false);

  const [salesmanSign, setSalesmanSign] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverSign, setReceiverSign] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!taxInvoiceId) { setLoading(false); return; }
    fetch(`/api/tax-invoices/${taxInvoiceId}`)
      .then(r => r.json())
      .then(({ data }) => setInvoice(data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [taxInvoiceId, t]);

  const handleSave = async () => {
    if (!invoice) { toast.error(t('deliveryNotes.selectInvoice')); return; }
    setSaving(true);
    try {
      const items = invoice.items.map((item, i) => ({
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

      const res = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxInvoiceId: invoice.id,
          quotationId: invoice.quotation?.id || null,
          customerId: invoice.customer.id,
          engineerName: invoice.engineerName,
          mobileNumber: invoice.mobileNumber,
          projectName: invoice.projectName,
          salesmanSign: salesmanSign || null,
          receiverName: receiverName || null,
          receiverSign: receiverSign || null,
          notes: notes || null,
          items,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { data } = await res.json();
      toast.success(t('messages.createSuccess', { entity: t('deliveryNotes.title') }));
      router.push(`/${locale}/delivery-notes/${data.id}`);
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
          title={t('deliveryNotes.create')}
          icon={Package2}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />{t('common.back')}
            </Button>
          }
        />

        <div className="p-5 space-y-6">

          {/* Source Invoice Info */}
          {invoice && (
            <Card className="shadow-premium border-primary/30 bg-primary/5">
              <CardContent className="pt-5">
                <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  {t('deliveryNotes.sourceInvoice')}: <span className="text-primary">{invoice.invoiceNumber}</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-[11px] text-muted-foreground font-medium">{t('quotations.customer')}</p><p className="font-bold">{invoice.customer.fullName}</p></div>
                  <div><p className="text-[11px] text-muted-foreground font-medium">{t('quotations.projectName')}</p><p className="font-bold">{invoice.projectName || '—'}</p></div>
                  <div><p className="text-[11px] text-muted-foreground font-medium">{t('quotations.lpoNumber')}</p><p className="font-bold">{invoice.lpoNumber || '—'}</p></div>
                  <div><p className="text-[11px] text-muted-foreground font-medium">{t('quotations.paymentTerms')}</p><p className="font-bold">{invoice.paymentTerms || '—'}</p></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items Preview */}
          {invoice && (
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="size-4 text-primary" />{t('quotations.items')} ({invoice.items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('quotations.description')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.size')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.unit')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.quantity')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.totalLM')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.lineTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoice.items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/10">
                          <td className="px-4 py-3 text-sm font-medium">{item.description}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.size || '—'}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.unit || '—'}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.quantity}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">
                            {item.unit === 'LM' && item.linearMeters ? `${item.linearMeters.toFixed(2)} LM` : '—'}
                          </td>
                          <td className="px-3 py-3 text-center text-sm font-medium">{fmt(item.total)} AED</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signatures */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PenLine className="size-4 text-primary" />{t('deliveryNotes.signatures')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium block mb-2 flex items-center gap-1.5">
                    <User className="size-3.5" />{t('deliveryNotes.salesmanSign')}
                  </label>
                  <Input value={salesmanSign} onChange={(e) => setSalesmanSign(e.target.value)} placeholder={t('deliveryNotes.salesmanSignPlaceholder')} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2 flex items-center gap-1.5">
                    <User className="size-3.5" />{t('deliveryNotes.receiverName')}
                  </label>
                  <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder={t('deliveryNotes.receiverNamePlaceholder')} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium block mb-2">{t('deliveryNotes.receiverSign')}</label>
                  <Input value={receiverSign} onChange={(e) => setReceiverSign(e.target.value)} placeholder={t('deliveryNotes.receiverSignPlaceholder')} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />{t('common.notes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t('common.notes')} />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>{t('common.cancel')}</Button>
            <Button className="btn-premium" onClick={handleSave} disabled={saving || !invoice}>
              {saving ? <Loader2 className="size-4 me-2 animate-spin" /> : <Save className="size-4 me-2" />}
              {t('deliveryNotes.generateDN')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
