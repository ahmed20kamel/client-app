'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createQuotationSchema, CreateQuotationInput } from '@/lib/validations/quotation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileText, ArrowLeft, Save, Loader2, User, Plus, Trash2,
  Package, Calculator, Phone, Building2, Truck, UserPlus, Calendar, Hash,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchableSelect } from '@/components/ui/searchable-select';

interface Client { id: string; companyName: string; trn: string | null; phone: string | null; address: string | null; }
interface Engineer { id: string; name: string; mobile: string | null; }
interface Product {
  id: string; name: string; description: string | null;
  sellingPrice: number | null; productCode: string | null; size: string | null; unitOfMeasure: string;
}

interface LineItem {
  productId: string | null; description: string; quantity: number;
  length: number; linearMeters: number; size: string; unitPrice: number; discount: number;
}

export default function CreateQuotationPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>('');

  // New Client modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientModalLoading, setClientModalLoading] = useState(false);
  const [newClient, setNewClient] = useState({ companyName: '', trn: '', phone: '', email: '', address: '' });

  // New Engineer modal
  const [showEngineerModal, setShowEngineerModal] = useState(false);
  const [engineerModalLoading, setEngineerModalLoading] = useState(false);
  const [newEngineer, setNewEngineer] = useState({ name: '', mobile: '', email: '' });

  const [items, setItems] = useState<LineItem[]>([
    { productId: null, description: '', quantity: 1, length: 100, linearMeters: 1, size: '', unitPrice: 0, discount: 0 },
  ]);

  const form = useForm<CreateQuotationInput>({
    resolver: zodResolver(createQuotationSchema),
    defaultValues: {
      customerId: null,
      engineerName: '',
      mobileNumber: '',
      projectName: '',
      notes: '',
      terms: 'Validity: 30 Days from the date of this quotation.',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      taxPercent: 5,
      deliveryCharges: 0,
      items: [],
    },
  });

  // Load clients and products
  useEffect(() => {
    Promise.all([
      fetch('/api/clients?engineers=true').then(r => r.json()),
      fetch('/api/inventory?limit=500').then(r => r.json()),
    ]).then(([clientsData, productsData]) => {
      setClients(clientsData.data || []);
      setProducts(productsData.data || []);
    }).catch(() => toast.error(t('common.error')));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load engineers when client changes
  useEffect(() => {
    if (!selectedClientId) { setEngineers([]); return; }
    fetch(`/api/clients/${selectedClientId}/engineers`)
      .then(r => r.json())
      .then(({ data }) => setEngineers(data || []))
      .catch(() => {});
  }, [selectedClientId]);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedEngineerId('');
    setEngineers([]);
    // Auto-fill form fields from client
    const client = clients.find(c => c.id === clientId);
    if (client) {
      form.setValue('engineerName', '');
      form.setValue('mobileNumber', '');
    }
  };

  const handleEngineerChange = (engineerId: string) => {
    setSelectedEngineerId(engineerId);
    const eng = engineers.find(e => e.id === engineerId);
    if (eng) {
      form.setValue('engineerName', eng.name);
      form.setValue('mobileNumber', eng.mobile || '');
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.companyName.trim()) { toast.error('Company name is required'); return; }
    setClientModalLoading(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setClients(prev => [...prev, data]);
      setSelectedClientId(data.id);
      setEngineers([]);
      setShowClientModal(false);
      setNewClient({ companyName: '', trn: '', phone: '', email: '', address: '' });
      toast.success(t('messages.createSuccess', { entity: t('clients.title') }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setClientModalLoading(false);
    }
  };

  const handleCreateEngineer = async () => {
    if (!selectedClientId) { toast.error('Select a client first'); return; }
    if (!newEngineer.name.trim()) { toast.error('Engineer name is required'); return; }
    setEngineerModalLoading(true);
    try {
      const res = await fetch(`/api/clients/${selectedClientId}/engineers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newEngineer, email: newEngineer.email.trim() || null }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setEngineers(prev => [...prev, data]);
      setSelectedEngineerId(data.id);
      form.setValue('engineerName', data.name);
      form.setValue('mobileNumber', data.mobile || '');
      setShowEngineerModal(false);
      setNewEngineer({ name: '', mobile: '', email: '' });
      toast.success(t('messages.createSuccess', { entity: t('clients.engineerName') }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setEngineerModalLoading(false);
    }
  };

  const taxPercent = form.watch('taxPercent') || 0;
  const deliveryCharges = form.watch('deliveryCharges') || 0;

  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      return sum + item.linearMeters * item.unitPrice * (1 - (item.discount || 0) / 100);
    }, 0);
    const taxAmount = subtotal * (taxPercent / 100);
    const total = subtotal + taxAmount + (deliveryCharges || 0);
    return { subtotal, taxAmount, total };
  }, [items, taxPercent, deliveryCharges]);

  const updateItem = (index: number, field: keyof LineItem, value: string | number | null) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'length') item.linearMeters = Number((item.quantity * item.length / 100).toFixed(4));
      updated[index] = item;
      return updated;
    });
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const unit = product.unitOfMeasure === 'LM' ? 'LM' : 'Nos';
      setItems((prev) => {
        const updated = [...prev];
        const qty = updated[index].quantity;
        const len = updated[index].length || 100;
        updated[index] = {
          ...updated[index], productId,
          description: product.name + (product.size ? ` ${product.size}` : ''),
          size: product.size || '',
          unitPrice: product.sellingPrice || 0,
          linearMeters: Number((qty * len / 100).toFixed(4)),
        };
        return updated;
      });
    }
  };

  const addItem = () => setItems(prev => [...prev,
    { productId: null, description: '', quantity: 1, length: 100, linearMeters: 1, size: '', unitPrice: 0, discount: 0 }]);

  const removeItem = (index: number) => { if (items.length <= 1) return; setItems(prev => prev.filter((_, i) => i !== index)); };

  useEffect(() => {
    form.setValue('items', items.map(item => ({
      productId: item.productId, description: item.description, quantity: item.quantity,
      length: item.length, linearMeters: item.linearMeters, size: item.size, unit: 'LM',
      unitPrice: item.unitPrice, discount: item.discount || 0,
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const onSubmit = async (data: CreateQuotationInput) => {
    // Client-side item validation
    const invalidItems = items.filter(item => !item.description.trim() || item.unitPrice <= 0);
    if (invalidItems.length > 0) {
      toast.error(t('quotations.itemsValidationError'));
      return;
    }
    try {
      setIsLoading(true);
      const payload = {
        ...data,
        clientId: selectedClientId || undefined,
        engineerId: selectedEngineerId || undefined,
        items: items.map(item => ({
          productId: item.productId || undefined,
          description: item.description,
          quantity: item.quantity,
          length: item.length,
          linearMeters: item.linearMeters,
          size: item.size || undefined,
          unit: 'LM',
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        })),
      };

      const response = await fetch('/api/quotations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response.ok) { const err = await response.json(); toast.error(err.error || t('common.error')); return; }
      const result = await response.json();
      toast.success(t('messages.createSuccess', { entity: t('quotations.title') }));
      router.push(`/${locale}/quotations/${result.data.id}`);
    } catch { toast.error(t('common.error')); }
    finally { setIsLoading(false); }
  };

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('quotations.create')}
          icon={FileText}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/quotations`)}>
              <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />{t('common.back')}
            </Button>
          }
        />

        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => { console.error('Form validation errors:', errors); toast.error('Please check the form fields'); })} className="space-y-5">

              {/* ── Section 1: Client / Engineer / Project ── */}
              <Card className="shadow-premium">
                <CardContent className="pt-5 space-y-4">

                  {/* Row 1: Date | Quotation# */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Calendar className="size-3.5 text-primary" />{t('common.date')}
                      </label>
                      <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <Hash className="size-3.5 text-primary" />Quotation Ref.
                      </label>
                      <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-dashed border-border bg-muted/20 text-sm text-muted-foreground/60">
                        <Hash className="size-3 shrink-0" />
                        <span className="italic tracking-wide">SC-{form.watch('projectName') ? form.watch('projectName')!.trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10) : '···'}-001-{new Date().getFullYear().toString().slice(-2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-border/60" />

                  {/* Row 2+3: [ Company / Address ] | [ Engineer / Mobile ] */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* LEFT: Company + Address stacked */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                          <Building2 className="size-3.5 text-primary" />{t('clients.companyName')}
                        </label>
                        <div className="flex gap-2">
                          <SearchableSelect
                            options={clients.map(c => ({ value: c.id, label: c.companyName }))}
                            value={selectedClientId}
                            onValueChange={handleClientChange}
                            placeholder={t('clients.selectClient')}
                            searchPlaceholder={t('common.search') + '...'}
                            className="flex-1 h-9"
                          />
                          <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => setShowClientModal(true)} title={t('clients.newClient')}>
                            <UserPlus className="size-4" />
                          </Button>
                        </div>
                        {selectedClient?.trn && (
                          <p className="mt-1.5 text-xs text-muted-foreground"><span className="font-semibold text-foreground">TRN:</span> {selectedClient.trn}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                          <Building2 className="size-3.5 text-primary" />Address
                        </label>
                        <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground truncate">
                          {selectedClient?.address || '—'}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT: Engineer + Mobile stacked */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                          <User className="size-3.5 text-primary" />{t('quotations.engineerName')}
                        </label>
                        <div className="flex gap-2">
                          <SearchableSelect
                            options={engineers.map(e => ({ value: e.id, label: e.name }))}
                            value={selectedEngineerId}
                            onValueChange={handleEngineerChange}
                            placeholder={selectedClientId ? t('clients.selectEngineer') : t('clients.selectClient')}
                            searchPlaceholder={t('common.search') + '...'}
                            disabled={!selectedClientId}
                            className="flex-1 h-9"
                          />
                          <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" disabled={!selectedClientId} onClick={() => setShowEngineerModal(true)}>
                            <Plus className="size-4" />
                          </Button>
                        </div>
                        {!selectedEngineerId && (
                          <FormField control={form.control} name="engineerName"
                            render={({ field }) => (
                              <FormItem className="mt-2">
                                <FormControl><Input {...field} value={field.value || ''} placeholder={t('quotations.engineerName')} className="h-9 text-sm" /></FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                          <Phone className="size-3.5 text-primary" />Mobile
                        </label>
                        {selectedEngineerId ? (
                          <div className="h-9 flex items-center px-3 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
                            {engineers.find(e => e.id === selectedEngineerId)?.mobile || '—'}
                          </div>
                        ) : (
                          <FormField control={form.control} name="mobileNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    value={field.value || ''}
                                    type="tel"
                                    inputMode="tel"
                                    maxLength={20}
                                    placeholder="+971 XX XXX XXXX"
                                    className="h-9 text-sm"
                                    onChange={(e) => {
                                      // Allow: digits, spaces, +, -, (, )
                                      const v = e.target.value.replace(/[^\d\s+\-().]/g, '');
                                      field.onChange(v);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Project Name | Valid Until */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                        <FileText className="size-3.5 text-primary" />{t('quotations.projectName')}
                      </label>
                      <FormField control={form.control} name="projectName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl><Input {...field} value={field.value || ''} placeholder={t('quotations.projectName')} className="h-9" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div>
                      <FormField control={form.control} name="validUntil"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('quotations.validUntil')}</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} type="date" className="h-9" min={new Date().toISOString().split('T')[0]} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* hidden customerId */}
                  <FormField control={form.control} name="customerId"
                    render={({ field }) => (
                      <FormItem className="hidden"><FormControl><Input {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* ── Section 2: Items + Totals + Notes (one card) ── */}
              <Card className="shadow-premium">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="size-4 text-primary" />{t('quotations.items')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">

                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-[2.5fr_0.8fr_0.7fr_0.8fr_0.9fr_0.8fr_0.9fr_32px] gap-x-3 px-3 py-2.5 bg-muted/60 rounded-lg text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{t('quotations.description')}</span>
                    <span className="text-center">{t('quotations.size')}</span>
                    <span className="text-center">{t('quotations.quantity')}</span>
                    <span className="text-center">{t('quotations.length')} (cm)</span>
                    <span className="text-center">Total LM</span>
                    <span className="text-center">{t('quotations.unitPrice')}</span>
                    <span className="text-right">{t('quotations.lineTotal')}</span>
                    <span />
                  </div>

                  {/* Item Rows */}
                  <div className="space-y-1.5">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-[2.5fr_0.8fr_0.7fr_0.8fr_0.9fr_0.8fr_0.9fr_32px] gap-x-3 items-center px-3 py-2 rounded-lg border border-border/30 bg-background hover:border-border/70 hover:bg-muted/10 transition-colors">
                      <SearchableSelect
                        options={products.map(p => ({ value: p.id, label: `${p.name}${p.size ? ` (${p.size})` : ''}` }))}
                        value={item.productId || ''}
                        onValueChange={(val) => handleProductSelect(index, val)}
                        placeholder={t('quotations.selectProduct')}
                        searchPlaceholder={t('common.search') + '...'}
                        className="h-8 text-sm"
                      />
                      <Input value={item.size} onChange={e => updateItem(index, 'size', e.target.value)} placeholder="—" className="h-8 text-sm text-center bg-muted/30 border-0 focus:border focus:border-border" />
                      <Input type="number" min="1" step="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center bg-muted/30 border-0 focus:border focus:border-border" />
                      <Input type="number" min="1" step="1" value={item.length} onChange={e => updateItem(index, 'length', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center bg-muted/30 border-0 focus:border focus:border-border" />
                      <div className="h-8 flex items-center justify-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{item.linearMeters.toFixed(2)}</span>
                        <span className="text-[9px] text-emerald-400">LM</span>
                      </div>
                      <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-8 text-sm text-center bg-muted/30 border-0 focus:border focus:border-border" />
                      <div className="h-8 flex items-center justify-end text-sm font-semibold tabular-nums text-foreground">
                        {fmt(item.linearMeters * item.unitPrice * (1 - (item.discount || 0) / 100))}
                      </div>
                      {items.length > 1
                        ? <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10" onClick={() => removeItem(index)}><Trash2 className="size-3.5" /></Button>
                        : <div />}
                    </div>
                  ))}
                  </div>

                  <Button type="button" variant="ghost" size="sm" onClick={addItem} className="w-full border border-dashed border-border/50 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 mt-1">
                    <Plus className="size-3.5 me-1.5" />{t('quotations.addItem')}
                  </Button>

                  {/* ── Bottom: Notes/Terms left, Tax+Summary right ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-border/60">

                    {/* Notes & Terms */}
                    <div className="space-y-4">
                      <FormField control={form.control} name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('common.notes')}</FormLabel>
                            <FormControl>
                              <textarea {...field} value={field.value || ''} rows={3} placeholder="Any special notes..."
                                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField control={form.control} name="terms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('quotations.terms')}</FormLabel>
                            <FormControl>
                              <textarea {...field} value={field.value || ''} rows={3}
                                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Tax + Summary */}
                    <div className="flex flex-col justify-end gap-4">
                      <div className="flex gap-4 flex-wrap">
                        <FormField control={form.control} name="taxPercent"
                          render={({ field }) => (
                            <FormItem className="w-32">
                              <FormLabel className="text-xs text-muted-foreground">{t('quotations.taxPercent')} (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" value={field.value ?? 5}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-9 text-center" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField control={form.control} name="deliveryCharges"
                          render={({ field }) => (
                            <FormItem className="w-44">
                              <FormLabel className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="size-3" />{t('quotations.deliveryCharges')} (AED)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" value={field.value ?? 0}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-9 text-center" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="border border-border/60 rounded-xl overflow-hidden text-sm">
                        <div className="flex justify-between px-4 py-2.5 border-b border-border/40">
                          <span className="text-muted-foreground">{t('quotations.subtotal')}</span>
                          <span className="font-medium tabular-nums">{fmt(calculations.subtotal)} AED</span>
                        </div>
                        <div className="flex justify-between px-4 py-2.5 border-b border-border/40">
                          <span className="text-muted-foreground">VAT ({taxPercent}%)</span>
                          <span className="font-medium tabular-nums">+{fmt(calculations.taxAmount)} AED</span>
                        </div>
                        {deliveryCharges > 0 && (
                          <div className="flex justify-between px-4 py-2.5 border-b border-border/40">
                            <span className="text-muted-foreground">{t('quotations.deliveryCharges')}</span>
                            <span className="font-medium tabular-nums">+{fmt(deliveryCharges)} AED</span>
                          </div>
                        )}
                        <div className="flex justify-between px-4 py-3 bg-primary text-primary-foreground font-bold text-base">
                          <span>{t('quotations.total')}</span>
                          <span className="tabular-nums">{fmt(calculations.total)} AED</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/quotations`)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" className="btn-premium" disabled={isLoading}>
                  {isLoading ? <Loader2 className="size-4 me-2 animate-spin" /> : <Save className="size-4 me-2" />}
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* New Client Modal */}
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />{t('clients.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.companyName')} *</label>
              <Input value={newClient.companyName} onChange={e => setNewClient(p => ({ ...p, companyName: e.target.value }))} placeholder="e.g. ABC Construction LLC" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.trn')}</label>
              <Input value={newClient.trn} onChange={e => setNewClient(p => ({ ...p, trn: e.target.value }))} placeholder="100XXXXXXXXXX003" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1.5">{t('clients.phone')}</label>
                <Input value={newClient.phone} type="tel" inputMode="tel" maxLength={20} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value.replace(/[^\d\s+\-().]/g, '') }))} placeholder="+971..." />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">{t('clients.email')}</label>
                <Input value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email: e.target.value }))} placeholder="info@..." type="email" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.address')}</label>
              <Input value={newClient.address} onChange={e => setNewClient(p => ({ ...p, address: e.target.value }))} placeholder="Dubai, UAE" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClientModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreateClient} disabled={clientModalLoading} className="btn-premium">
              {clientModalLoading ? <Loader2 className="size-4 me-1 animate-spin" /> : <Plus className="size-4 me-1" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Engineer Modal */}
      <Dialog open={showEngineerModal} onOpenChange={setShowEngineerModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />{t('clients.addEngineer')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.engineerName')} *</label>
              <Input value={newEngineer.name} onChange={e => setNewEngineer(p => ({ ...p, name: e.target.value }))} placeholder="Eng. Ahmed Mohamed" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">{t('clients.engineerMobile')}</label>
              <Input value={newEngineer.mobile} type="tel" inputMode="tel" maxLength={20} onChange={e => setNewEngineer(p => ({ ...p, mobile: e.target.value.replace(/[^\d\s+\-().]/g, '') }))} placeholder="+971..." />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5 flex items-center gap-1">{t('clients.engineerEmail')} <span className="text-xs text-muted-foreground font-normal">({t('common.optional')})</span></label>
              <Input value={newEngineer.email} onChange={e => setNewEngineer(p => ({ ...p, email: e.target.value }))} placeholder="eng@..." type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEngineerModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleCreateEngineer} disabled={engineerModalLoading} className="btn-premium">
              {engineerModalLoading ? <Loader2 className="size-4 me-1 animate-spin" /> : <Plus className="size-4 me-1" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
