'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import {
  DollarSign, Search, Plus, Loader2, Receipt, Building2,
  CheckCircle2, Clock, AlertCircle, X, Calendar, Hash,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  paidAmount: number;
  createdAt: string;
  client: { id: string; companyName: string } | null;
  customer: { id: string; fullName: string } | null;
  quotation: { id: string; quotationNumber: string } | null;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  paymentDate: string;
  reference: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  createdBy: { fullName: string };
}

const STATUS_COLORS: Record<string, string> = {
  PAID:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  UNPAID:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const METHOD_COLORS: Record<string, string> = {
  Cash:          'bg-emerald-100 text-emerald-700',
  Cheque:        'bg-blue-100 text-blue-700',
  'Bank Transfer': 'bg-purple-100 text-purple-700',
};

export default function PaymentsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  // Invoice search
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searched, setSearched] = useState(false);

  // Selected invoice + its payments
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Add payment form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'Cash' | 'Cheque' | 'Bank Transfer'>('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const searchInvoices = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/tax-invoices?search=${encodeURIComponent(search.trim())}&limit=20`);
      const { data } = await res.json();
      setInvoices(data || []);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSearching(false);
    }
  }, [search, t]);

  const loadPayments = useCallback(async (invoiceId: string) => {
    setLoadingPayments(true);
    try {
      const res = await fetch(`/api/tax-invoices/${invoiceId}/payments`);
      const { data } = await res.json();
      setPayments(data || []);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoadingPayments(false);
    }
  }, [t]);

  const selectInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayments([]);
    setShowForm(false);
    loadPayments(inv.id);
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error(t('payments.amountRequired')); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/tax-invoices/${selectedInvoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, method, paymentDate, reference: reference || null, notes: notes || null, status: 'CONFIRMED' }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(t('payments.created'));
      setShowForm(false);
      setAmount(''); setReference(''); setNotes('');
      // Refresh invoice data + payments
      const invRes = await fetch(`/api/tax-invoices/${selectedInvoice.id}`);
      const { data } = await invRes.json();
      setSelectedInvoice(data);
      // Update in list
      setInvoices(prev => prev.map(i => i.id === data.id ? data : i));
      await loadPayments(selectedInvoice.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedInvoice) return;
    try {
      const res = await fetch(`/api/tax-invoices/${selectedInvoice.id}/payments/${paymentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(t('payments.deleted'));
      const invRes = await fetch(`/api/tax-invoices/${selectedInvoice.id}`);
      const { data } = await invRes.json();
      setSelectedInvoice(data);
      setInvoices(prev => prev.map(i => i.id === data.id ? data : i));
      await loadPayments(selectedInvoice.id);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const remaining = selectedInvoice ? selectedInvoice.total - selectedInvoice.paidAmount : 0;

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('payments.title')}
          subtitle={t('payments.subtitle')}
          icon={DollarSign}
        />

        <div className="p-5 space-y-5">

          {/* ── Search ── */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="size-4 text-primary" />{t('common.search')} — {t('payments.invoice')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchInvoices()}
                  placeholder="e.g. SC-137-26 or invoice number..."
                  className="max-w-sm"
                />
                <Button onClick={searchInvoices} disabled={searching || !search.trim()}>
                  {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  <span className="ms-1.5">{t('common.search')}</span>
                </Button>
              </div>

              {/* Results */}
              {searched && (
                <div className="mt-4 space-y-2">
                  {searching && <p className="text-sm text-muted-foreground">{t('common.loading')}…</p>}
                  {!searching && invoices.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('payments.noPayments')}</p>
                  )}
                  {!searching && invoices.map(inv => {
                    const bal = inv.total - inv.paidAmount;
                    const isSelected = selectedInvoice?.id === inv.id;
                    return (
                      <div
                        key={inv.id}
                        onClick={() => selectInvoice(inv)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Receipt className="size-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{inv.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="size-3" />
                              {inv.client?.companyName || inv.customer?.fullName || '—'}
                              {inv.quotation && <span className="ms-2 text-primary/70">• {inv.quotation.quotationNumber}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Total / Remaining</p>
                            <p className="text-sm font-bold">{fmt(inv.total)} <span className="text-muted-foreground font-normal">/</span> <span className={bal > 0 ? 'text-red-600' : 'text-emerald-600'}>{fmt(bal)}</span> AED</p>
                          </div>
                          <Badge className={STATUS_COLORS[inv.status] || ''}>{inv.status}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Selected Invoice Detail ── */}
          {selectedInvoice && (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="shadow-sm text-center">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                    <p className="text-xl font-extrabold tabular-nums">{fmt(selectedInvoice.total)}</p>
                    <p className="text-xs text-muted-foreground">AED</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm text-center">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Paid</p>
                    <p className="text-xl font-extrabold tabular-nums text-emerald-600">{fmt(selectedInvoice.paidAmount)}</p>
                    <p className="text-xs text-muted-foreground">AED</p>
                  </CardContent>
                </Card>
                <Card className={`shadow-sm text-center ${remaining > 0.01 ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Remaining</p>
                    <p className={`text-xl font-extrabold tabular-nums ${remaining > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>{fmt(remaining)}</p>
                    <p className="text-xs text-muted-foreground">AED</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payments list + Add */}
              <Card className="shadow-premium">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="size-4 text-primary" />
                      {t('payments.title')} — <span className="text-primary">{selectedInvoice.invoiceNumber}</span>
                    </CardTitle>
                    {remaining > 0.01 && (
                      <Button size="sm" className="btn-premium" onClick={() => setShowForm(v => !v)}>
                        {showForm ? <X className="size-3.5 me-1.5" /> : <Plus className="size-3.5 me-1.5" />}
                        {showForm ? t('common.cancel') : t('payments.create')}
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Add payment form */}
                  {showForm && (
                    <div className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                      <p className="text-sm font-semibold">{t('payments.create')}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">{t('payments.amount')} *</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder={`Max ${fmt(remaining)}`}
                          />
                          {parseFloat(amount) > remaining + 0.01 && (
                            <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="size-3" />{t('payments.overpayment')}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">{t('payments.method')} *</label>
                          <select
                            value={method}
                            onChange={e => setMethod(e.target.value as typeof method)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">{t('payments.paidAt')}</label>
                          <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">{t('payments.reference')}</label>
                          <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Cheque #, Ref..." />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">{t('payments.notes')}</label>
                        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('payments.notes')} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
                        <Button size="sm" className="btn-premium" onClick={handleAddPayment} disabled={saving}>
                          {saving ? <Loader2 className="size-4 me-1.5 animate-spin" /> : <Plus className="size-4 me-1.5" />}
                          {t('payments.create')}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Payments table */}
                  {loadingPayments ? (
                    <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-primary" /></div>
                  ) : payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">{t('payments.noPayments')}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            {['Date', 'Amount', 'Method', 'Reference', 'By', ''].map(h => (
                              <th key={h} className="px-3 py-2.5 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider text-start">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {payments.map(p => (
                            <tr key={p.id} className="hover:bg-muted/10">
                              <td className="px-3 py-2.5">
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                  <Calendar className="size-3.5" />
                                  {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-bold text-emerald-600">{fmt(p.amount)} AED</td>
                              <td className="px-3 py-2.5">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${METHOD_COLORS[p.method] || 'bg-muted text-muted-foreground'}`}>
                                  {p.method}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground">{p.reference || '—'}</td>
                              <td className="px-3 py-2.5 text-muted-foreground text-xs">{p.createdBy?.fullName}</td>
                              <td className="px-3 py-2.5">
                                <Button
                                  variant="ghost" size="sm"
                                  className="size-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeletePayment(p.id)}
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick link to full invoice */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/tax-invoices/${selectedInvoice.id}`)}>
                  <Receipt className="size-3.5 me-1.5" />View Full Invoice
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
