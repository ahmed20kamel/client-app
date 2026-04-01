'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Package2, ArrowLeft, Trash2, AlertCircle, User, Calendar, Hash,
  Phone, Building2, FileText, Package, Printer, PenLine,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';

interface DNItem {
  id: string; description: string; quantity: number; length: number | null;
  linearMeters: number | null; size: string | null; unit: string | null;
  unitPrice: number; total: number;
  product: { id: string; name: string } | null;
}

interface DeliveryNote {
  id: string; dnNumber: string; status: string;
  engineerName: string | null; mobileNumber: string | null; projectName: string | null;
  salesmanSign: string | null; receiverName: string | null; receiverSign: string | null;
  notes: string | null; deliveredAt: string | null; createdAt: string;
  customer: { id: string; fullName: string };
  taxInvoice: { id: string; invoiceNumber: string; lpoNumber: string | null; paymentTerms: string | null } | null;
  quotation: { id: string; quotationNumber: string } | null;
  items: DNItem[];
}

export default function DeliveryNoteDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [dn, setDN] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('deliveryNotes.statusDraft'),
    DELIVERED: t('deliveryNotes.statusDelivered'),
    RETURNED: t('deliveryNotes.statusReturned'),
  };

  useEffect(() => {
    fetch(`/api/delivery-notes/${id}`)
      .then(r => r.json())
      .then(({ data }) => setDN(data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/delivery-notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setDN(data);
      toast.success(t('messages.updateSuccess', { entity: t('deliveryNotes.title') }));
    } catch { toast.error(t('common.error')); }
    finally { setStatusLoading(false); }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/delivery-notes/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success(t('messages.deleteSuccess', { entity: t('deliveryNotes.title') })); router.push(`/${locale}/delivery-notes`); }
    else toast.error(t('common.error'));
  };

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-AE');

  if (loading) return <div className="p-3 md:p-3.5"><div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"><DetailSkeleton /></div></div>;
  if (!dn) return (
    <div className="p-3 md:p-3.5"><div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="flex flex-col items-center justify-center py-16"><AlertCircle className="size-12 mb-4 text-muted-foreground/40" /><p className="text-muted-foreground">{t('common.noData')}</p></div>
    </div></div>
  );

  const InfoRow = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><Icon className="size-4 text-muted-foreground" /></div>
        <div><p className="text-[11px] text-muted-foreground font-medium">{label}</p><p className="text-sm font-bold">{value}</p></div>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-fade-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/delivery-notes`)}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{dn.dnNumber}</h1>
                <StatusBadge status={dn.status} label={STATUS_LABELS[dn.status] || dn.status} />
              </div>
              {dn.projectName && <p className="text-muted-foreground mt-0.5">{dn.projectName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => window.open(`/${locale}/delivery-notes/${id}/print`, '_blank')}>
              <Printer className="size-4 me-1" />{t('common.export')}
            </Button>
            <Select value={dn.status} onValueChange={handleStatusChange} disabled={statusLoading}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">{t('deliveryNotes.statusDraft')}</SelectItem>
                <SelectItem value="DELIVERED">{t('deliveryNotes.statusDelivered')}</SelectItem>
                <SelectItem value="RETURNED">{t('deliveryNotes.statusReturned')}</SelectItem>
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="size-4 me-1" />{t('common.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="p-5 space-y-6">

          {/* Details */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                <Package2 className="size-4 text-primary" />{t('deliveryNotes.details')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoRow icon={Hash} label={t('deliveryNotes.dnNumber')} value={dn.dnNumber} />
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><User className="size-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">{t('quotations.customer')}</p>
                    <Link href={`/${locale}/customers/${dn.customer.id}`} className="text-sm font-bold text-primary hover:underline">{dn.customer.fullName}</Link>
                  </div>
                </div>
                <InfoRow icon={User} label={t('quotations.engineerName')} value={dn.engineerName} />
                <InfoRow icon={Phone} label={t('quotations.mobileNumber')} value={dn.mobileNumber} />
                <InfoRow icon={Building2} label={t('quotations.projectName')} value={dn.projectName} />
                <InfoRow icon={Calendar} label={t('common.date')} value={fmtDate(dn.createdAt)} />
                {dn.deliveredAt && <InfoRow icon={Calendar} label={t('deliveryNotes.deliveredAt')} value={fmtDate(dn.deliveredAt)} />}
                {dn.taxInvoice && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><FileText className="size-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('deliveryNotes.invoiceRef')}</p>
                      <Link href={`/${locale}/tax-invoices/${dn.taxInvoice.id}`} className="text-sm font-bold text-primary hover:underline">{dn.taxInvoice.invoiceNumber}</Link>
                    </div>
                  </div>
                )}
                <InfoRow icon={FileText} label={t('quotations.lpoNumber')} value={dn.taxInvoice?.lpoNumber || null} />
                <InfoRow icon={FileText} label={t('quotations.paymentTerms')} value={dn.taxInvoice?.paymentTerms || null} />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                <Package className="size-4 text-primary" />{t('quotations.items')} ({dn.items.length})
              </h3>
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
                    {dn.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
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

          {/* Signatures */}
          {(dn.salesmanSign || dn.receiverName || dn.receiverSign) && (
            <Card className="shadow-premium">
              <CardContent className="pt-6">
                <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                  <PenLine className="size-4 text-primary" />{t('deliveryNotes.signatures')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <InfoRow icon={User} label={t('deliveryNotes.salesmanSign')} value={dn.salesmanSign} />
                  <InfoRow icon={User} label={t('deliveryNotes.receiverName')} value={dn.receiverName} />
                  <InfoRow icon={PenLine} label={t('deliveryNotes.receiverSign')} value={dn.receiverSign} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {dn.notes && (
            <Card className="shadow-premium">
              <CardContent className="pt-6">
                <h3 className="text-sm font-extrabold mb-2">{t('common.notes')}</h3>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{dn.notes}</p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
