'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import { ClipboardList, ArrowLeft, Save, Loader2, Package, Calendar, FileText } from 'lucide-react';

interface QuotationItem {
  id: string; description: string; quantity: number;
  length: number | null; linearMeters: number | null;
  size: string | null; unit: string | null;
}
interface Quotation {
  id: string; quotationNumber: string; status: string;
  customerId: string | null; clientId: string | null;
  engineerName: string | null; mobileNumber: string | null; projectName: string | null;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string } | null;
  items: QuotationItem[];
}

export default function NewWorkOrderPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const quotationId = searchParams.get('quotationId');

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(!!quotationId);
  const [saving, setSaving] = useState(false);
  const [workingDays, setWorkingDays] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!quotationId) { setLoading(false); return; }
    fetch(`/api/quotations/${quotationId}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (data.status !== 'CONFIRMED') {
          toast.error('Quotation must be CONFIRMED to create a work order');
          router.push(`/${locale}/quotations/${quotationId}`);
          return;
        }
        setQuotation(data);
        setNotes(data.notes || '');
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [quotationId, locale, router, t]);

  const handleSave = async () => {
    if (!quotation) { toast.error('No quotation selected'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: quotation.id,
          customerId: quotation.customerId || null,
          clientId: quotation.clientId || null,
          engineerName: quotation.engineerName,
          mobileNumber: quotation.mobileNumber,
          projectName: quotation.projectName,
          workingDays,
          notes: notes || null,
          items: quotation.items.map((item, i) => ({
            description: item.description,
            quantity: item.quantity,
            length: item.length,
            linearMeters: item.linearMeters,
            size: item.size,
            unit: item.unit,
            sortOrder: i,
          })),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { data } = await res.json();
      toast.success(t('workOrders.createdSuccess'));
      router.push(`/${locale}/work-orders/${data.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border p-16 flex justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    </div>
  );

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('workOrders.new')}
          icon={ClipboardList}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />{t('common.back')}
            </Button>
          }
        />

        <div className="p-5 space-y-6">
          {/* Source Quotation */}
          {quotation && (
            <Card className="border-primary/30 bg-primary/5 shadow-premium">
              <CardContent className="pt-5">
                <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  {t('workOrders.sourceQuotation')}: <span className="text-primary">{quotation.quotationNumber}</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t('workOrders.engineerName')}</p>
                    <p className="font-bold mt-0.5">{quotation.client?.companyName || quotation.customer?.fullName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t('workOrders.projectName')}</p>
                    <p className="font-bold mt-0.5">{quotation.projectName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{t('workOrders.engineerName')}</p>
                    <p className="font-bold mt-0.5">{quotation.engineerName || '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Working Days */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="size-4 text-primary" />{t('workOrders.workingDays')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">{t('workOrders.daysToComplete')} *</label>
                <Input
                  type="number"
                  min={1}
                  value={workingDays}
                  onChange={e => setWorkingDays(parseInt(e.target.value) || 1)}
                  placeholder={t('workOrders.workingDaysPlaceholder')}
                  className="max-w-xs"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">{t('common.notes')}</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any notes for the production team..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </CardContent>
          </Card>

          {/* Items — NO prices */}
          {quotation && quotation.items.length > 0 && (
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="size-4 text-primary" />
                  {t('workOrders.items')} ({quotation.items.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground">{t('workOrders.noPrice')}</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.description')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.unit')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.quantity')}</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">L/PC (cm)</th>
                        <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">{t('workOrders.totalLM')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotation.items.map(item => (
                        <tr key={item.id} className="hover:bg-muted/10">
                          <td className="px-4 py-3 text-sm font-medium">{item.description}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.unit || '—'}</td>
                          <td className="px-3 py-3 text-center text-sm">{item.quantity}</td>
                          <td className="px-3 py-3 text-center text-sm text-muted-foreground">
                            {item.unit === 'LM' && item.length != null ? item.length.toFixed(2) : '—'}
                          </td>
                          <td className="px-3 py-3 text-center text-sm text-emerald-600 font-semibold">
                            {item.unit === 'LM' && item.linearMeters ? `${item.linearMeters.toFixed(2)} LM` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50/60 border-t-2 border-blue-200">
                        <td className="px-4 py-2 text-xs font-bold text-blue-800 uppercase tracking-wide">{t('quotations.totalSummary')}</td>
                        <td className="px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                        <td className="px-3 py-2 text-center tabular-nums font-extrabold text-blue-700">
                          {quotation.items.reduce((s, i) => s + i.quantity, 0)}
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-muted-foreground">—</td>
                        <td className="px-3 py-2 text-center tabular-nums font-extrabold text-emerald-700">
                          {(() => { const t2 = quotation.items.reduce((s, i) => s + (i.linearMeters ?? 0), 0); return t2 > 0 ? `${t2.toFixed(2)} LM` : '—'; })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => router.back()}>{t('common.cancel')}</Button>
            <Button className="btn-premium" onClick={handleSave} disabled={saving || !quotation}>
              {saving ? <Loader2 className="size-4 me-2 animate-spin" /> : <Save className="size-4 me-2" />}
              {t('workOrders.create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
