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
  Package, Calculator, Phone, Building2, Truck, UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface Client { id: string; companyName: string; trn: string | null; phone: string | null; }
interface Engineer { id: string; name: string; mobile: string | null; }
interface Product {
  id: string; name: string; description: string | null;
  sellingPrice: number | null; productCode: string | null; size: string | null; unitOfMeasure: string;
}

interface LineItem {
  productId: string | null; description: string; quantity: number;
  length: number; linearMeters: number; size: string; unit: string; unitPrice: number; discount: number;
}

const isLMProduct = (unit: string) => unit === 'LM';

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
    { productId: null, description: '', quantity: 1, length: 1, linearMeters: 1, size: '', unit: 'Nos', unitPrice: 0, discount: 0 },
  ]);

  const form = useForm<CreateQuotationInput>({
    resolver: zodResolver(createQuotationSchema),
    defaultValues: {
      customerId: '',
      engineerName: '',
      mobileNumber: '',
      projectName: '',
      subject: '',
      notes: '',
      terms: 'Validity: 30 Days from the date of this quotation.',
      validUntil: '',
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
      const qty = isLMProduct(item.unit) ? item.linearMeters : item.quantity;
      return sum + qty * item.unitPrice * (1 - (item.discount || 0) / 100);
    }, 0);
    const taxAmount = subtotal * (taxPercent / 100);
    const total = subtotal + taxAmount + (deliveryCharges || 0);
    return { subtotal, taxAmount, total };
  }, [items, taxPercent, deliveryCharges]);

  const updateItem = (index: number, field: keyof LineItem, value: string | number | null) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'length') item.linearMeters = item.quantity * item.length;
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
        updated[index] = {
          ...updated[index], productId,
          description: product.name + (product.size ? ` ${product.size}` : ''),
          size: product.size || '', unit,
          unitPrice: product.sellingPrice || 0,
        };
        return updated;
      });
    }
  };

  const addItem = () => setItems(prev => [...prev,
    { productId: null, description: '', quantity: 1, length: 1, linearMeters: 1, size: '', unit: 'Nos', unitPrice: 0, discount: 0 }]);

  const removeItem = (index: number) => { if (items.length <= 1) return; setItems(prev => prev.filter((_, i) => i !== index)); };

  useEffect(() => {
    form.setValue('items', items.map(item => ({
      productId: item.productId, description: item.description, quantity: item.quantity,
      length: item.length, linearMeters: item.linearMeters, size: item.size, unit: item.unit,
      unitPrice: item.unitPrice, discount: item.discount || 0,
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const onSubmit = async (data: CreateQuotationInput) => {
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
          length: isLMProduct(item.unit) ? item.length : undefined,
          linearMeters: isLMProduct(item.unit) ? item.linearMeters : undefined,
          size: item.size || undefined,
          unit: item.unit,
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Client & Engineer Section */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="size-4 text-primary" />{t('quotations.clientInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Client Dropdown + New Client button */}
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                        <Building2 className="size-3.5" />{t('clients.companyName')} *
                      </label>
                      <div className="flex gap-2">
                        <Select value={selectedClientId} onValueChange={handleClientChange}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t('clients.selectClient')} />
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={4}>
                            {clients.length === 0 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                {t('common.noData')} — <button type="button" className="text-primary underline" onClick={() => setShowClientModal(true)}>{t('clients.create')}</button>
                              </div>
                            ) : clients.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.companyName}{c.trn ? ` — TRN: ${c.trn}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setShowClientModal(true)} title={t('clients.newClient')}>
                          <UserPlus className="size-4" />
                        </Button>
                      </div>
                      {selectedClient && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Building2 className="size-3" />{selectedClient.companyName}
                          {selectedClient.phone && <><span className="mx-1">·</span><Phone className="size-3" />{selectedClient.phone}</>}
                        </p>
                      )}
                    </div>

                    {/* Engineer Dropdown + New Engineer button */}
                    <div>
                      <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                        <User className="size-3.5" />{t('quotations.engineerName')}
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedEngineerId}
                          onValueChange={handleEngineerChange}
                          disabled={!selectedClientId}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={selectedClientId ? t('clients.selectEngineer') : t('clients.selectClient')} />
                          </SelectTrigger>
                          <SelectContent>
                            {engineers.map(e => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.name}{e.mobile ? ` — ${e.mobile}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button" variant="outline" size="icon" className="shrink-0"
                          disabled={!selectedClientId}
                          onClick={() => setShowEngineerModal(true)}
                          title={t('clients.newEngineer')}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Project Name */}
                    <FormField
                      control={form.control} name="projectName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Building2 className="size-3.5" />{t('quotations.projectName')}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder={t('quotations.projectName')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Valid Until */}
                    <FormField
                      control={form.control} name="validUntil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('quotations.validUntil')}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Hidden: customerId — required by API, use clientId as fallback */}
                    <FormField
                      control={form.control} name="customerId"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Engineer Name (auto-filled, editable override) */}
                    <FormField
                      control={form.control} name="engineerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <User className="size-3.5" />{t('quotations.engineerName')} (override)
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder={t('quotations.engineerName')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Mobile (auto-filled) */}
                    <FormField
                      control={form.control} name="mobileNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Phone className="size-3.5" />{t('quotations.mobileNumber')}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="+971 XX XXX XXXX" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="size-4 text-primary" />{t('quotations.items')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border border-border/60 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-muted-foreground">{t('quotations.item')} #{index + 1}</span>
                        {items.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(index)}>
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                          <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                            <Package className="size-3.5" />{t('quotations.product')}
                          </label>
                          <Select value={item.productId || ''} onValueChange={val => handleProductSelect(index, val)}>
                            <SelectTrigger><SelectValue placeholder={t('quotations.selectProduct')} /></SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} {p.size ? `(${p.size})` : ''} — {p.unitOfMeasure}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.size')}</label>
                          <Input value={item.size} onChange={e => updateItem(index, 'size', e.target.value)} placeholder="e.g. 10×20" />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.unit')}</label>
                          <Select value={item.unit} onValueChange={val => updateItem(index, 'unit', val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LM">LM (Linear Meter)</SelectItem>
                              <SelectItem value="Nos">Nos (Piece)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="lg:col-span-2 xl:col-span-4">
                          <label className="text-sm font-medium mb-2 block">{t('quotations.description')} *</label>
                          <Input value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder={t('quotations.description')} />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {isLMProduct(item.unit) ? t('quotations.qty') : t('quotations.quantity')} *
                          </label>
                          <Input type="number" min="0.01" step="0.01" value={item.quantity}
                            onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)} />
                        </div>

                        {isLMProduct(item.unit) && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">{t('quotations.length')} (m) *</label>
                            <Input type="number" min="0.01" step="0.01" value={item.length}
                              onChange={e => updateItem(index, 'length', parseFloat(e.target.value) || 0)} />
                          </div>
                        )}

                        {isLMProduct(item.unit) && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">{t('quotations.totalLM')}</label>
                            <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/30 text-sm font-medium">
                              {item.linearMeters.toFixed(2)} LM
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.unitPrice')} (AED) *</label>
                          <Input type="number" min="0" step="0.01" value={item.unitPrice}
                            onChange={e => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.discount')} (%)</label>
                          <Input type="number" min="0" max="100" step="0.01" value={item.discount}
                            onChange={e => updateItem(index, 'discount', parseFloat(e.target.value) || 0)} />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.lineTotal')}</label>
                          <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/30 text-sm font-medium">
                            {fmt((isLMProduct(item.unit) ? item.linearMeters : item.quantity) * item.unitPrice * (1 - (item.discount || 0) / 100))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField control={form.control} name="taxPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('quotations.taxPercent')} (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" value={field.value ?? 5}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name="deliveryCharges"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Truck className="size-3.5" />{t('quotations.deliveryCharges')} (AED)
                          </FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" value={field.value ?? 0}
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-6 border-t pt-4 space-y-2 max-w-sm ms-auto">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('quotations.subtotal')}</span>
                      <span className="font-medium">{fmt(calculations.subtotal)} AED</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('quotations.tax')} ({taxPercent}%)</span>
                      <span className="font-medium">+{fmt(calculations.taxAmount)} AED</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('quotations.deliveryCharges')}</span>
                      <span className="font-medium">+{fmt(deliveryCharges)} AED</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t pt-2">
                      <span>{t('quotations.total')}</span>
                      <span>{fmt(calculations.total)} AED</span>
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
                <Input value={newClient.phone} onChange={e => setNewClient(p => ({ ...p, phone: e.target.value }))} placeholder="+971..." />
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
              <Input value={newEngineer.mobile} onChange={e => setNewEngineer(p => ({ ...p, mobile: e.target.value }))} placeholder="+971..." />
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
