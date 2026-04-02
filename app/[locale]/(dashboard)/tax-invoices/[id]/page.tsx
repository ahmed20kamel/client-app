'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Receipt, ArrowLeft, Trash2, AlertCircle, User, Calendar, Hash,
  Phone, Building2, FileText, Package, Printer, Package2, Plus, DollarSign,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';

interface TaxInvoiceItem {
  id: string; description: string; quantity: number; length: number | null;
  linearMeters: number | null; size: string | null; unit: string | null;
  unitPrice: number; total: number;
}
interface DeliveryNoteRef { id: string; dnNumber: string; status: string; createdAt: string; }
interface Payment {
  id: string; amount: number; method: string; paymentDate: string;
  reference: string | null; notes: string | null; status: string;
  createdBy: { fullName: string };
}

interface TaxInvoice {
  id: string; invoiceNumber: string; status: string;
  engineerName: string | null; mobileNumber: string | null; projectName: string | null;
  customerTrn: string | null; ourVatReg: string | null; dnNumber: string | null;
  lpoNumber: string | null; paymentTerms: string | null;
  subtotal: number; taxPercent: number; taxAmount: number; deliveryCharges: number;
  total: number; paidAmount: number;
  notes: string | null; terms: string | null;
  createdAt: string;
  customer: { id: string; fullName: string };
  client: { id: string; companyName: string; trn: string | null } | null;
  engineer: { id: string; name: string; mobile: string | null } | null;
  quotation: { id: string; quotationNumber: string } | null;
  items: TaxInvoiceItem[];
  deliveryNotes?: DeliveryNoteRef[];
  payments: Payment[];
}

export default function TaxInvoiceDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [invoice, setInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '', method: 'Cash', paymentDate: new Date().toISOString().split('T')[0],
    reference: '', notes: '', status: 'CONFIRMED',
  });

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: t('taxInvoices.statusDraft'),
    SENT: t('taxInvoices.statusSent'),
    PAID: t('taxInvoices.statusPaid'),
    CANCELLED: t('taxInvoices.statusCancelled'),
    UNPAID: t('taxInvoices.statusUnpaid'),
    PARTIAL: t('taxInvoices.statusPartial'),
  };

  const fetchInvoice = () => {
    fetch(`/api/tax-invoices/${id}`)
      .then(r => r.json())
      .then(({ data }) => setInvoice(data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInvoice(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/tax-invoices/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setInvoice(data);
      toast.success(t('messages.updateSuccess', { entity: t('taxInvoices.title') }));
    } catch { toast.error(t('common.error')); }
    finally { setStatusLoading(false); }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/tax-invoices/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success(t('messages.deleteSuccess', { entity: t('taxInvoices.title') })); router.push(`/${locale}/tax-invoices`); }
    else toast.error(t('common.error'));
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/tax-invoices/${id}/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPayment, amount }),
      });
      if (!res.ok) throw new Error();
      setShowPaymentModal(false);
      setNewPayment({ amount: '', method: 'Cash', paymentDate: new Date().toISOString().split('T')[0], reference: '', notes: '', status: 'CONFIRMED' });
      // Refetch invoice
      setLoading(true);
      fetchInvoice();
      toast.success(t('messages.createSuccess', { entity: t('taxInvoices.payments') }));
    } catch { toast.error(t('common.error')); }
    finally { setPaymentLoading(false); }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const res = await fetch(`/api/tax-invoices/${id}/payments/${paymentId}`, { method: 'DELETE' });
    if (res.ok) {
      setLoading(true); fetchInvoice();
      toast.success(t('messages.deleteSuccess', { entity: t('taxInvoices.payments') }));
    } else toast.error(t('common.error'));
  };

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-AE');

  if (loading) return <div className="p-3 md:p-3.5"><div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"><DetailSkeleton /></div></div>;

  if (!invoice) return (
    <div className="p-3 md:p-3.5"><div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="flex flex-col items-center justify-center py-16"><AlertCircle className="size-12 mb-4 text-muted-foreground/40" /><p className="text-muted-foreground">{t('common.noData')}</p></div>
    </div></div>
  );

  const remaining = invoice.total - (invoice.paidAmount || 0);

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
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/tax-invoices`)}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
                <StatusBadge status={invoice.status} label={STATUS_LABELS[invoice.status] || invoice.status} />
              </div>
              {invoice.projectName && <p className="text-muted-foreground mt-0.5">{invoice.projectName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => window.open(`/${locale}/tax-invoices/${id}/print`, '_blank')}>
              <Printer className="size-4 me-1" />{t('common.export')}
            </Button>

            <Select value={invoice.status} onValueChange={handleStatusChange} disabled={statusLoading}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">{t('taxInvoices.statusDraft')}</SelectItem>
                <SelectItem value="SENT">{t('taxInvoices.statusSent')}</SelectItem>
                <SelectItem value="UNPAID">{t('taxInvoices.statusUnpaid')}</SelectItem>
                <SelectItem value="PARTIAL">{t('taxInvoices.statusPartial')}</SelectItem>
                <SelectItem value="PAID">{t('taxInvoices.statusPaid')}</SelectItem>
                <SelectItem value="CANCELLED">{t('taxInvoices.statusCancelled')}</SelectItem>
              </SelectContent>
            </Select>

            {(invoice.deliveryNotes?.length ?? 0) === 0 && (
              <Button size="sm" className="btn-premium" onClick={() => router.push(`/${locale}/delivery-notes/new?taxInvoiceId=${invoice.id}`)}>
                <Package2 className="size-4 me-1" />{t('taxInvoices.createDN')}
              </Button>
            )}

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

          {/* Payment Summary Bar */}
          {invoice.total > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/40 rounded-xl p-4 text-center border border-border/50">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('quotations.total')}</p>
                <p className="text-lg font-bold">{fmt(invoice.total)}</p>
                <p className="text-[10px] text-muted-foreground">AED</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-4 text-center border border-emerald-500/20">
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('taxInvoices.paidAmount')}</p>
                <p className="text-lg font-bold text-emerald-600">{fmt(invoice.paidAmount || 0)}</p>
                <p className="text-[10px] text-muted-foreground">AED</p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${remaining > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/40 border-border/50'}`}>
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('taxInvoices.remaining')}</p>
                <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>{fmt(remaining)}</p>
                <p className="text-[10px] text-muted-foreground">AED</p>
              </div>
            </div>
          )}

          {/* Details */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                <Receipt className="size-4 text-primary" />{t('taxInvoices.details')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoRow icon={Hash} label={t('taxInvoices.invoiceNumber')} value={invoice.invoiceNumber} />
                {invoice.client ? (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><Building2 className="size-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('clients.companyName')}</p>
                      <p className="text-sm font-bold">{invoice.client.companyName}</p>
                      {invoice.client.trn && <p className="text-xs text-muted-foreground">TRN: {invoice.client.trn}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><User className="size-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('quotations.customer')}</p>
                      <Link href={`/${locale}/customers/${invoice.customer.id}`} className="text-sm font-bold text-primary hover:underline">{invoice.customer.fullName}</Link>
                    </div>
                  </div>
                )}
                <InfoRow icon={User} label={t('quotations.engineerName')} value={invoice.engineer?.name || invoice.engineerName} />
                <InfoRow icon={Phone} label={t('quotations.mobileNumber')} value={invoice.engineer?.mobile || invoice.mobileNumber} />
                <InfoRow icon={Building2} label={t('quotations.projectName')} value={invoice.projectName} />
                <InfoRow icon={Hash} label={t('taxInvoices.customerTrn')} value={invoice.customerTrn} />
                <InfoRow icon={Hash} label={t('taxInvoices.ourVatReg')} value={invoice.ourVatReg} />
                <InfoRow icon={FileText} label={t('quotations.lpoNumber')} value={invoice.lpoNumber} />
                <InfoRow icon={FileText} label={t('quotations.paymentTerms')} value={invoice.paymentTerms} />
                <InfoRow icon={FileText} label={t('taxInvoices.dnNumber')} value={invoice.dnNumber} />
                <InfoRow icon={Calendar} label={t('common.date')} value={fmtDate(invoice.createdAt)} />
                {invoice.quotation && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0"><FileText className="size-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('taxInvoices.quotationRef')}</p>
                      <Link href={`/${locale}/quotations/${invoice.quotation.id}`} className="text-sm font-bold text-primary hover:underline">{invoice.quotation.quotationNumber}</Link>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <h3 className="text-sm font-extrabold mb-5 flex items-center gap-2">
                <Package className="size-4 text-primary" />{t('quotations.items')} ({invoice.items.length})
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
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.unitPrice')}</th>
                      <th className="px-3 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase">{t('quotations.lineTotal')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-sm font-medium">{item.description}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.size || '—'}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.unit || '—'}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">
                          {item.unit === 'LM' && item.linearMeters ? item.linearMeters.toFixed(2) : '—'}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-muted-foreground">{fmt(item.unitPrice)}</td>
                        <td className="px-3 py-3 text-center text-sm font-medium">{fmt(item.total)} AED</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 border-t pt-4 max-w-sm ms-auto space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('quotations.subtotal')}</span><span className="font-medium">{fmt(invoice.subtotal)} AED</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('quotations.tax')} ({invoice.taxPercent}% VAT)</span><span className="font-medium">+{fmt(invoice.taxAmount)} AED</span></div>
                {invoice.deliveryCharges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('quotations.deliveryCharges')}</span>
                    <span className="font-medium">+{fmt(invoice.deliveryCharges)} AED</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2"><span>{t('quotations.total')}</span><span>{fmt(invoice.total)} AED</span></div>
              </div>
            </CardContent>
          </Card>

          {/* Payments Section */}
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <DollarSign className="size-4 text-primary" />{t('taxInvoices.payments')}
                </h3>
                <Button size="sm" variant="outline" onClick={() => setShowPaymentModal(true)}>
                  <Plus className="size-4 me-1" />{t('taxInvoices.addPayment')}
                </Button>
              </div>

              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">{t('taxInvoices.noPayments')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-4 py-2.5 text-start text-[11px] font-bold text-muted-foreground uppercase">{t('taxInvoices.paymentDate')}</th>
                        <th className="px-3 py-2.5 text-start text-[11px] font-bold text-muted-foreground uppercase">{t('taxInvoices.paymentMethod')}</th>
                        <th className="px-3 py-2.5 text-start text-[11px] font-bold text-muted-foreground uppercase">{t('taxInvoices.paymentReference')}</th>
                        <th className="px-3 py-2.5 text-end text-[11px] font-bold text-muted-foreground uppercase">{t('taxInvoices.paymentAmount')}</th>
                        <th className="px-3 py-2.5 text-center text-[11px] font-bold text-muted-foreground uppercase">{t('common.status')}</th>
                        <th className="px-3 py-2.5 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {invoice.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">{fmtDate(p.paymentDate)}</td>
                          <td className="px-3 py-3 text-muted-foreground">{p.method}</td>
                          <td className="px-3 py-3 text-muted-foreground">{p.reference || '—'}</td>
                          <td className="px-3 py-3 text-end font-bold text-emerald-600">{fmt(p.amount)} AED</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${p.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>
                              {p.status === 'CONFIRMED' ? t('taxInvoices.paymentConfirmed') : t('taxInvoices.paymentPending')}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
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
                                  <AlertDialogAction onClick={() => handleDeletePayment(p.id)} className="bg-destructive text-white hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Delivery Notes */}
          {(invoice.deliveryNotes?.length ?? 0) > 0 && (
            <Card className="shadow-premium">
              <CardContent className="pt-6">
                <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2">
                  <Package2 className="size-4 text-primary" />{t('taxInvoices.deliveryNotes')}
                </h3>
                <div className="space-y-2">
                  {invoice.deliveryNotes!.map((dn) => (
                    <Link key={dn.id} href={`/${locale}/delivery-notes/${dn.id}`} className="flex items-center justify-between p-3 rounded-lg border border-border/60 hover:bg-muted/20 transition-colors">
                      <span className="text-sm font-bold text-primary">{dn.dnNumber}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{fmtDate(dn.createdAt)}</span>
                        <StatusBadge status={dn.status} label={dn.status} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* Add Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="size-4 text-primary" />{t('taxInvoices.addPayment')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('taxInvoices.paymentAmount')} (AED) *</label>
              <Input type="number" min="0.01" step="0.01" value={newPayment.amount}
                onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))}
                placeholder={`Remaining: ${(invoice.total - (invoice.paidAmount || 0)).toFixed(2)}`} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('taxInvoices.paymentMethod')}</label>
              <Select value={newPayment.method} onValueChange={v => setNewPayment(p => ({ ...p, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">{t('taxInvoices.cash')}</SelectItem>
                  <SelectItem value="Cheque">{t('taxInvoices.cheque')}</SelectItem>
                  <SelectItem value="Bank Transfer">{t('taxInvoices.bankTransfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('taxInvoices.paymentDate')}</label>
              <Input type="date" value={newPayment.paymentDate}
                onChange={e => setNewPayment(p => ({ ...p, paymentDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('taxInvoices.paymentReference')}</label>
              <Input value={newPayment.reference}
                onChange={e => setNewPayment(p => ({ ...p, reference: e.target.value }))}
                placeholder="Cheque # / Transfer ref" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('taxInvoices.paymentNotes')}</label>
              <Input value={newPayment.notes}
                onChange={e => setNewPayment(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAddPayment} disabled={paymentLoading} className="btn-premium">
              <Plus className="size-4 me-1" />{t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
