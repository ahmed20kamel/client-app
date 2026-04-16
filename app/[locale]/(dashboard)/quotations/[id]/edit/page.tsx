'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateQuotationSchema, UpdateQuotationInput } from '@/lib/validations/quotation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileText, ArrowLeft, Save, Loader2, User, Plus, Trash2,
  Package, Calculator, Phone, Building2, Truck, UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageSkeleton } from '@/components/ui/page-skeleton';

interface Client { id: string; companyName: string; trn: string | null; phone: string | null; }
interface Engineer { id: string; name: string; mobile: string | null; }
interface Product {
  id: string; name: string; description: string | null;
  sellingPrice: number | null; productCode: string | null; size: string | null; unitOfMeasure: string;
}

interface LineItem {
  productId: string | null; description: string; quantity: number;
  length: number; linearMeters: number; size: string; unitPrice: number; discount: number;
}

export default function EditQuotationPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
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

  const form = useForm<UpdateQuotationInput>({
    resolver: zodResolver(updateQuotationSchema),
    defaultValues: {
      engineerName: '',
      mobileNumber: '',
      projectName: '',
      notes: '',
      terms: '',
      validUntil: '',
      taxPercent: 5,
      deliveryCharges: 0,
      items: [],
    },
  });

  // Load clients and products, then load quotation
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quotationRes, clientsRes, productsRes] = await Promise.all([
          fetch(`/api/quotations/${id}`),
          fetch('/api/clients?engineers=true'),
          fetch('/api/inventory?limit=500'),
        ]);

        if (!quotationRes.ok) {
          toast.error(t('common.error'));
          router.push(`/${locale}/quotations`);
          return;
        }

        const { data } = await quotationRes.json();

        if (data.status !== 'DRAFT') {
          toast.error(t('quotations.cannotEditNonDraft'));
          router.push(`/${locale}/quotations/${id}`);
          return;
        }

        if (clientsRes.ok) setClients((await clientsRes.json()).data || []);
        if (productsRes.ok) setProducts((await productsRes.json()).data || []);

        // Pre-select client & engineer
        if (data.client?.id) {
          setSelectedClientId(data.client.id);
          // Load engineers for this client
          const engRes = await fetch(`/api/clients/${data.client.id}/engineers`);
          if (engRes.ok) {
            const { data: engs } = await engRes.json();
            setEngineers(engs || []);
          }
        }
        if (data.engineer?.id) {
          setSelectedEngineerId(data.engineer.id);
        }

        form.reset({
          engineerName: data.engineerName || '',
          mobileNumber: data.mobileNumber || '',
          projectName: data.projectName || '',
          notes: data.notes || '',
          terms: data.terms || '',
          validUntil: data.validUntil ? data.validUntil.split('T')[0] : '',
          taxPercent: data.taxPercent ?? 5,
          deliveryCharges: data.deliveryCharges ?? 0,
        });

        const mappedItems: LineItem[] = data.items.map((item: {
          productId: string | null; description: string; quantity: number;
          length: number | null; linearMeters: number | null; size: string | null;
          unitPrice: number; discount: number;
        }) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          length: item.length ?? 100,
          linearMeters: item.linearMeters ?? Number((item.quantity * (item.length ?? 100) / 100).toFixed(4)),
          size: item.size || '',
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        }));
        setItems(mappedItems);
      } catch {
        toast.error(t('common.error'));
        router.push(`/${locale}/quotations`);
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load engineers when client changes (only after initial load)
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    if (initialLoad) { setInitialLoad(false); return; }
    if (!selectedClientId) { setEngineers([]); return; }
    fetch(`/api/clients/${selectedClientId}/engineers`)
      .then(r => r.json())
      .then(({ data }) => setEngineers(data || []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedEngineerId('');
    setEngineers([]);
    form.setValue('engineerName', '');
    form.setValue('mobileNumber', '');
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
        body: JSON.stringify(newEngineer),
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

  const onSubmit = async (data: UpdateQuotationInput) => {
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

      const response = await fetch(`/api/quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        toast.error(err.error || t('common.error'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('quotations.title') }));
      router.push(`/${locale}/quotations/${id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (isFetching) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('quotations.edit')}
          icon={FileText}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/quotations/${id}`)}>
              <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />{t('common.back')}
            </Button>
          }
        />

        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => { console.error('Form validation errors:', errors); toast.error('Please check the form fields'); })} className="space-y-6">

              {/* Client & Engineer Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Company ── */}
                <Card className="shadow-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground font-semibold uppercase tracking-wide">
                      <Building2 className="size-3.5 text-primary" />{t('clients.companyName')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                    {selectedClient && (
                      <div className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-1.5 text-xs">
                        {selectedClient.trn && <div className="flex items-center gap-1.5 text-muted-foreground"><span className="font-semibold text-foreground">TRN:</span>{selectedClient.trn}</div>}
                        {selectedClient.phone && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="size-3" />{selectedClient.phone}</div>}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ── Engineer ── */}
                <Card className="shadow-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground font-semibold uppercase tracking-wide">
                      <User className="size-3.5 text-primary" />{t('quotations.engineerName')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                      <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" disabled={!selectedClientId} onClick={() => setShowEngineerModal(true)} title={t('clients.newEngineer')}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    {selectedEngineerId ? (
                      <div className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-1.5 text-xs">
                        {engineers.find(e => e.id === selectedEngineerId)?.mobile && (
                          <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="size-3" />{engineers.find(e => e.id === selectedEngineerId)?.mobile}</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FormField control={form.control} name="engineerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl><Input {...field} value={field.value || ''} placeholder={t('quotations.engineerName')} className="h-9 text-sm" /></FormControl>
                            </FormItem>
                          )}
                        />
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
                                    const v = e.target.value.replace(/[^\d\s+\-().]/g, '');
                                    field.onChange(v);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ── Project ── */}
                <Card className="shadow-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground font-semibold uppercase tracking-wide">
                      <FileText className="size-3.5 text-primary" />{t('quotations.projectName')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <FormField control={form.control} name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl><Input {...field} value={field.value || ''} placeholder={t('quotations.projectName')} className="h-9 text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="validUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{t('quotations.validUntil')}</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''} type="date" className="h-9 text-sm" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

              </div>

              {/* Line Items */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="size-4 text-primary" />{t('quotations.items')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">

                  {/* Table Header — desktop */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_40px] gap-3 px-3 py-2 bg-muted/40 rounded-lg text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    <span>{t('quotations.description')}</span>
                    <span className="text-center">{t('quotations.size')}</span>
                    <span className="text-center">{t('quotations.quantity')}</span>
                    <span className="text-center">{t('quotations.length')} (cm)</span>
                    <span className="text-center">Total LM</span>
                    <span className="text-center">{t('quotations.unitPrice')}</span>
                    <span className="text-center">{t('quotations.lineTotal')}</span>
                    <span />
                  </div>

                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_36px] gap-2 items-center p-3 border border-border/50 rounded-xl hover:bg-muted/10 transition-colors">
                      {/* Product */}
                      <SearchableSelect
                        options={products.map(p => ({ value: p.id, label: `${p.name}${p.size ? ` (${p.size})` : ''}` }))}
                        value={item.productId || ''}
                        onValueChange={(val) => handleProductSelect(index, val)}
                        placeholder={t('quotations.selectProduct')}
                        searchPlaceholder={t('common.search') + '...'}
                        className="h-9 text-sm"
                      />
                      {/* Size */}
                      <Input value={item.size} onChange={e => updateItem(index, 'size', e.target.value)} placeholder="10×20" className="h-9 text-sm text-center" />
                      {/* QTY */}
                      <Input type="number" min="1" step="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} className="h-9 text-sm text-center" />
                      {/* Length */}
                      <Input type="number" min="1" step="1" value={item.length} onChange={e => updateItem(index, 'length', parseFloat(e.target.value) || 0)} className="h-9 text-sm text-center" />
                      {/* Total LM */}
                      <div className="h-9 flex flex-col items-center justify-center px-2 rounded-md bg-emerald-50 border border-emerald-200">
                        <span className="text-sm font-bold text-emerald-700 leading-none">{item.linearMeters.toFixed(2)}</span>
                        <span className="text-[9px] text-emerald-500 leading-none">{item.quantity}×{item.length}cm</span>
                      </div>
                      {/* Unit Price */}
                      <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-9 text-sm text-center" />
                      {/* Total */}
                      <div className="h-9 flex items-center justify-center px-2 rounded-md bg-muted/40 text-sm font-bold">
                        {fmt(item.linearMeters * item.unitPrice * (1 - (item.discount || 0) / 100))}
                      </div>
                      {/* Delete */}
                      {items.length > 1 ? (
                        <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(index)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      ) : <div />}
                    </div>
                  ))}

                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full mt-1">
                    <Plus className="size-4 me-1" />{t('quotations.addItem')}
                  </Button>
                </CardContent>
              </Card>

              {/* Totals */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="size-4 text-primary" />{t('quotations.totals')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                    {/* Inputs */}
                    <div className="flex gap-4 flex-wrap">
                      <FormField control={form.control} name="taxPercent"
                        render={({ field }) => (
                          <FormItem className="w-32">
                            <FormLabel className="text-xs">{t('quotations.taxPercent')} (%)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.01" value={field.value ?? 5}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-9 text-center" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField control={form.control} name="deliveryCharges"
                        render={({ field }) => (
                          <FormItem className="w-40">
                            <FormLabel className="text-xs flex items-center gap-1"><Truck className="size-3" />{t('quotations.deliveryCharges')} (AED)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.01" value={field.value ?? 0}
                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-9 text-center" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {/* Summary */}
                    <div className="w-full md:w-72 border border-border/60 rounded-xl overflow-hidden text-sm">
                      <div className="flex justify-between px-4 py-2.5 border-b border-border/40">
                        <span className="text-muted-foreground">{t('quotations.subtotal')}</span>
                        <span className="font-medium">{fmt(calculations.subtotal)} AED</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5 border-b border-border/40">
                        <span className="text-muted-foreground">VAT ({taxPercent}%)</span>
                        <span className="font-medium">+{fmt(calculations.taxAmount)} AED</span>
                      </div>
                      {deliveryCharges > 0 && (
                        <div className="flex justify-between px-4 py-2.5 border-b border-border/40">
                          <span className="text-muted-foreground">{t('quotations.deliveryCharges')}</span>
                          <span className="font-medium">+{fmt(deliveryCharges)} AED</span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-3 bg-primary text-primary-foreground font-bold text-base">
                        <span>{t('quotations.total')}</span>
                        <span>{fmt(calculations.total)} AED</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes & Terms */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="size-4 text-primary" />{t('quotations.notesAndTerms')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <FormField control={form.control} name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.notes')}</FormLabel>
                        <FormControl>
                          <textarea {...field} value={field.value || ''} rows={3}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={form.control} name="terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('quotations.terms')}</FormLabel>
                        <FormControl>
                          <textarea {...field} value={field.value || ''} rows={3}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/quotations/${id}`)}>
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
              <label className="text-sm font-medium block mb-1.5">{t('clients.engineerEmail')}</label>
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
