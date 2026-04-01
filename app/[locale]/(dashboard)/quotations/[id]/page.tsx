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
  FileText, User, ArrowLeft, Pencil, Trash2, AlertCircle,
  Calendar, Send, CheckCircle, XCircle, DollarSign, Hash,
  Phone, Building2, Truck, Receipt, Package, Printer,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  length: number | null;
  linearMeters: number | null;
  size: string | null;
  unit: string | null;
  unitPrice: number;
  discount: number;
  total: number;
  product: { id: string; name: string } | null;
}

interface LinkedDoc { id: string; invoiceNumber?: string; dnNumber?: string; status: string; createdAt: string; }

interface Quotation {
  id: string;
  quotationNumber: string;
  engineerName: string | null;
  mobileNumber: string | null;
  projectName: string | null;
  subject: string | null;
  status: string;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  deliveryCharges: number;
  total: number;
  lpoNumber: string | null;
  paymentTerms: string | null;
  rejectionReason: string | null;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  createdAt: string;
  customer: { id: string; fullName: string; };
  items: QuotationItem[];
  taxInvoices?: LinkedDoc[];
  deliveryNotes?: LinkedDoc[];
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

  // Approval dialog state
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [lpoNumber, setLpoNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<'Cash' | 'Cheque' | 'Transfer'>('Cash');

  // Reject dialog state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('quotations.statusDraft'),
    SENT: t('quotations.statusSent'),
    APPROVED: t('quotations.statusApproved'),
    REJECTED: t('quotations.statusRejected'),
    EXPIRED: t('quotations.statusExpired'),
    CONVERTED: t('quotations.statusConverted'),
  };

  useEffect(() => {
    fetch(`/api/quotations/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          toast.error(t('common.error'));
          router.push(`/${locale}/quotations`);
          return;
        }
        const { data } = await res.json();
        setQuotation(data);
      })
      .catch(() => { toast.error(t('common.error')); router.push(`/${locale}/quotations`); })
      .finally(() => setLoading(false));
  }, [id, t, router, locale]);

  const patchQuotation = async (body: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { data } = await res.json();
      setQuotation(data);
      toast.success(t('messages.updateSuccess', { entity: t('quotations.title') }));
      return true;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSend = () => patchQuotation({ action: 'send' });

  const handleApprove = async () => {
    if (!lpoNumber.trim()) { toast.error(t('quotations.lpoRequired')); return; }
    const ok = await patchQuotation({ action: 'approve', lpoNumber, paymentTerms });
    if (ok) setShowApproveDialog(false);
  };

  const handleReject = async () => {
    const ok = await patchQuotation({ action: 'reject', rejectionReason });
    if (ok) setShowRejectDialog(false);
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success(t('messages.deleteSuccess', { entity: t('quotations.title') }));
      router.push(`/${locale}/quotations`);
    } else toast.error(t('common.error'));
  };

  const handleCreateTaxInvoice = () => {
    if (!quotation) return;
    router.push(`/${locale}/tax-invoices/new?quotationId=${quotation.id}`);
  };

  const handlePrint = () => window.open(`/${locale}/quotations/${id}/print`, '_blank');

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-AE');

  if (loading) return (
    <div className="p-3 md:p-3.5"><div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"><DetailSkeleton /></div></div>
  );

  if (!quotation) return (
    <div className="p-3 md:p-3.5"><div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    </div></div>
  );

  const InfoRow = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | number | null | undefined }) => {
    if (!value && value !== 0) return null;
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
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/quotations`)}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{quotation.quotationNumber}</h1>
                <StatusBadge status={quotation.status} label={STATUS_LABELS[quotation.status] || quotation.status} />
              </div>
              {quotation.projectName && <p className="text-muted-foreground mt-0.5">{quotation.projectName}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="size-4 me-1" />
              {t('common.export')}
            </Button>

            {quotation.status === 'DRAFT' && (
              <>
                <Button variant="outline" size="sm" onClick={handleSend} disabled={actionLoading}>
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
              </>
            )}

            {quotation.status === 'SENT' && (
              <>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setShowApproveDialog(true)} disabled={actionLoading}>
                  <CheckCircle className="size-4 me-1" />{t('quotations.approve')}
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setShowRejectDialog(true)} disabled={actionLoading}>
                  <XCircle className="size-4 me-1" />{t('quotations.reject')}
                </Button>
              </>
            )}

            {quotation.status === 'APPROVED' && (quotation.taxInvoices?.length ?? 0) === 0 && (
              <Button size="sm" className="btn-premium" onClick={handleCreateTaxInvoice}>
                <Receipt className="size-4 me-1" />{t('quotations.createTaxInvoice')}
              </Button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-6">

          {/* Rejection Reason */}
          {quotation.status === 'REJECTED' && quotation.rejectionReason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
              <XCircle className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-destructive">{t('quotations.rejectionReason')}</p>
                <p className="text-sm text-muted-foreground mt-1">{quotation.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* LPO Info (after approval) */}
          {quotation.status === 'APPROVED' && quotation.lpoNumber && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
              <CheckCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{t('quotations.lpoNumber')}</p>
                  <p className="text-sm font-bold">{quotation.lpoNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">{t('quotations.paymentTerms')}</p>
                  <p className="text-sm font-bold">{quotation.paymentTerms}</p>
                </div>
              </div>
            </div>
          )}

          {/* Details */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                <FileText className="size-4 text-primary" />{t('quotations.details')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoRow icon={Hash} label={t('quotations.quotationNumber')} value={quotation.quotationNumber} />
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><User className="size-4 text-muted-foreground" /></div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">{t('quotations.customer')}</p>
                    <Link href={`/${locale}/customers/${quotation.customer.id}`} className="text-sm font-bold text-primary hover:underline">{quotation.customer.fullName}</Link>
                  </div>
                </div>
                <InfoRow icon={User} label={t('quotations.engineerName')} value={quotation.engineerName} />
                <InfoRow icon={Phone} label={t('quotations.mobileNumber')} value={quotation.mobileNumber} />
                <InfoRow icon={Building2} label={t('quotations.projectName')} value={quotation.projectName} />
                <InfoRow icon={Calendar} label={t('common.date')} value={fmtDate(quotation.createdAt)} />
                <InfoRow icon={Calendar} label={t('quotations.validUntil')} value={quotation.validUntil ? fmtDate(quotation.validUntil) : null} />
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                <Package className="size-4 text-primary" />{t('quotations.items')} ({quotation.items.length})
              </h3>

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
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-4 text-start text-sm font-bold">{item.description}</td>
                        <td className="px-3 py-4 text-center text-sm text-muted-foreground">{item.size || '—'}</td>
                        <td className="px-3 py-4 text-center text-sm text-muted-foreground">{item.unit || '—'}</td>
                        <td className="px-3 py-4 text-center text-sm text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-4 text-center text-sm text-muted-foreground">
                          {item.unit === 'LM' && item.linearMeters ? `${item.linearMeters.toFixed(2)} LM` : '—'}
                        </td>
                        <td className="px-3 py-4 text-center text-sm text-muted-foreground">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-4 text-center text-sm font-medium">{fmt(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
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

          {/* Linked Tax Invoices */}
          {(quotation.taxInvoices?.length ?? 0) > 0 && (
            <Card className="shadow-premium">
              <CardContent className="pt-6">
                <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />{t('quotations.taxInvoices')}
                </h3>
                <div className="space-y-2">
                  {quotation.taxInvoices!.map((inv) => (
                    <Link key={inv.id} href={`/${locale}/tax-invoices/${inv.id}`} className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/20 transition-colors">
                      <span className="text-sm font-bold text-primary">{inv.invoiceNumber}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{fmtDate(inv.createdAt)}</span>
                        <StatusBadge status={inv.status} label={inv.status} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {(quotation.notes || quotation.terms) && (
            <Card className="shadow-premium">
              <CardContent className="pt-6 space-y-4">
                {quotation.notes && (
                  <div>
                    <h3 className="text-sm font-extrabold mb-2">{t('common.notes')}</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.notes}</p>
                  </div>
                )}
                {quotation.terms && (
                  <div>
                    <h3 className="text-sm font-extrabold mb-2">{t('quotations.terms')}</h3>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quotations.approveQuotation')}</AlertDialogTitle>
            <AlertDialogDescription>{t('quotations.approveDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium block mb-2">{t('quotations.lpoNumber')} *</label>
              <Input value={lpoNumber} onChange={(e) => setLpoNumber(e.target.value)} placeholder="e.g. LPO-2026-001" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">{t('quotations.paymentTerms')} *</label>
              <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v as typeof paymentTerms)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle className="size-4 me-1" />{t('quotations.approve')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quotations.rejectQuotation')}</AlertDialogTitle>
            <AlertDialogDescription>{t('quotations.rejectDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium block mb-2">{t('quotations.rejectionReason')} ({t('common.optional') || 'Optional'})</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={t('quotations.rejectionReasonPlaceholder') || 'Enter rejection reason...'}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={actionLoading} className="bg-destructive text-white hover:bg-destructive/90">
              <XCircle className="size-4 me-1" />{t('quotations.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
