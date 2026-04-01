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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  FileText, ArrowLeft, Save, Loader2, User, Plus, Trash2,
  Package, Calculator, Phone, Building2, Truck,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageSkeleton } from '@/components/ui/page-skeleton';

interface Customer { id: string; fullName: string; }
interface Product {
  id: string;
  name: string;
  description: string | null;
  sellingPrice: number | null;
  productCode: string | null;
  size: string | null;
  unitOfMeasure: string;
}

interface LineItem {
  productId: string | null;
  description: string;
  quantity: number;
  length: number;
  linearMeters: number;
  size: string;
  unit: string;
  unitPrice: number;
  discount: number;
}

const isLMProduct = (unit: string) => unit === 'LM';

export default function EditQuotationPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<LineItem[]>([
    { productId: null, description: '', quantity: 1, length: 1, linearMeters: 1, size: '', unit: 'Nos', unitPrice: 0, discount: 0 },
  ]);

  const form = useForm<UpdateQuotationInput>({
    resolver: zodResolver(updateQuotationSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [quotationRes, customersRes, productsRes] = await Promise.all([
          fetch(`/api/quotations/${id}`),
          fetch('/api/customers?limit=500'),
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

        form.reset({
          customerId: data.customer.id,
          engineerName: data.engineerName || '',
          mobileNumber: data.mobileNumber || '',
          projectName: data.projectName || '',
          subject: data.subject || '',
          notes: data.notes || '',
          terms: data.terms || '',
          validUntil: data.validUntil ? data.validUntil.split('T')[0] : '',
          taxPercent: data.taxPercent ?? 5,
          deliveryCharges: data.deliveryCharges ?? 0,
        });

        const mappedItems: LineItem[] = data.items.map((item: {
          productId: string | null; description: string; quantity: number;
          length: number | null; linearMeters: number | null; size: string | null;
          unit: string | null; unitPrice: number; discount: number;
        }) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          length: item.length ?? 1,
          linearMeters: item.linearMeters ?? item.quantity,
          size: item.size || '',
          unit: item.unit || 'Nos',
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        }));
        setItems(mappedItems);

        if (customersRes.ok) setCustomers((await customersRes.json()).data || []);
        if (productsRes.ok) setProducts((await productsRes.json()).data || []);
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
      if (field === 'quantity' || field === 'length') {
        item.linearMeters = item.quantity * item.length;
      }
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
          ...updated[index],
          productId,
          description: product.name + (product.size ? ` ${product.size}` : ''),
          size: product.size || '',
          unit,
          unitPrice: product.sellingPrice || 0,
        };
        return updated;
      });
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { productId: null, description: '', quantity: 1, length: 1, linearMeters: 1, size: '', unit: 'Nos', unitPrice: 0, discount: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    form.setValue('items', items.map((item) => ({
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      length: item.length,
      linearMeters: item.linearMeters,
      size: item.size,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const onSubmit = async (data: UpdateQuotationInput) => {
    try {
      setIsLoading(true);
      const payload = {
        ...data,
        items: items.map((item) => ({
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
              <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />
              {t('common.back')}
            </Button>
          }
        />

        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Client & Project Info */}
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="size-4 text-primary" />
                    {t('quotations.clientInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <User className="size-3.5" />{t('quotations.customer')} *
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder={t('quotations.selectCustomer')} /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engineerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <User className="size-3.5" />{t('quotations.engineerName')}
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder={t('quotations.engineerName')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mobileNumber"
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

                    <FormField
                      control={form.control}
                      name="projectName"
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

                    <FormField
                      control={form.control}
                      name="validUntil"
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
                        {/* Product */}
                        <div className="lg:col-span-2">
                          <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                            <Package className="size-3.5" />{t('quotations.product')}
                          </label>
                          <Select value={item.productId || ''} onValueChange={(val) => handleProductSelect(index, val)}>
                            <SelectTrigger><SelectValue placeholder={t('quotations.selectProduct')} /></SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} {p.size ? `(${p.size})` : ''} — {p.unitOfMeasure}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Size */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.size')}</label>
                          <Input value={item.size} onChange={(e) => updateItem(index, 'size', e.target.value)} placeholder="e.g. 10×20" />
                        </div>

                        {/* Unit */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.unit')}</label>
                          <Select value={item.unit} onValueChange={(val) => updateItem(index, 'unit', val)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LM">LM (Linear Meter)</SelectItem>
                              <SelectItem value="Nos">Nos (Piece)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Description */}
                        <div className="lg:col-span-2 xl:col-span-4">
                          <label className="text-sm font-medium mb-2 block">{t('quotations.description')} *</label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder={t('quotations.description')}
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {isLMProduct(item.unit) ? t('quotations.qty') : t('quotations.quantity')} *
                          </label>
                          <Input
                            type="number" min="0.01" step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Length (LM only) */}
                        {isLMProduct(item.unit) && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">{t('quotations.length')} (m) *</label>
                            <Input
                              type="number" min="0.01" step="0.01"
                              value={item.length}
                              onChange={(e) => updateItem(index, 'length', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        )}

                        {/* Total LM (readonly, LM only) */}
                        {isLMProduct(item.unit) && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">{t('quotations.totalLM')}</label>
                            <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/30 text-sm font-medium">
                              {item.linearMeters.toFixed(2)} LM
                            </div>
                          </div>
                        )}

                        {/* Unit Price */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.unitPrice')} (AED) *</label>
                          <Input
                            type="number" min="0" step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Discount */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.discount')} (%)</label>
                          <Input
                            type="number" min="0" max="100" step="0.01"
                            value={item.discount}
                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        {/* Line Total */}
                        <div>
                          <label className="text-sm font-medium mb-2 block">{t('quotations.lineTotal')}</label>
                          <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/30 text-sm font-medium">
                            {fmt(
                              (isLMProduct(item.unit) ? item.linearMeters : item.quantity)
                              * item.unitPrice
                              * (1 - (item.discount || 0) / 100)
                            )}
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
                    <FormField
                      control={form.control}
                      name="taxPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('quotations.taxPercent')} (%)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" value={field.value ?? 5}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryCharges"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Truck className="size-3.5" />{t('quotations.deliveryCharges')} (AED)
                          </FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" value={field.value ?? 0}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
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
                  <FormField
                    control={form.control}
                    name="notes"
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
                  <FormField
                    control={form.control}
                    name="terms"
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

              {/* Actions */}
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
    </div>
  );
}
