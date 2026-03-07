'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePurchaseOrderSchema, UpdatePurchaseOrderInput } from '@/lib/validations/purchase-order';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  ShoppingCart,
  ArrowLeft,
  Save,
  Loader2,
  Truck,
  FileText,
  Calendar,
  Plus,
  Trash2,
  Package,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageSkeleton } from '@/components/ui/page-skeleton';

interface SupplierOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
  unitPrice: number;
}

export default function EditPurchaseOrderPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [notDraft, setNotDraft] = useState(false);

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [items, setItems] = useState<Array<{
    productId: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>>([{ productId: null, description: '', quantity: 1, unitPrice: 0 }]);

  const form = useForm<UpdatePurchaseOrderInput>({
    resolver: zodResolver(updatePurchaseOrderSchema),
  });

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const response = await fetch(`/api/purchase-orders/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast.error(t('messages.notFound', { entity: t('purchaseOrders.title') }));
          } else if (response.status === 403) {
            toast.error(t('messages.unauthorized'));
          }
          router.push(`/${locale}/purchase-orders`);
          return;
        }

        const { data } = await response.json();

        if (data.status !== 'DRAFT') {
          setNotDraft(true);
          setIsFetching(false);
          return;
        }

        form.reset({
          supplierId: data.supplier.id,
          subject: data.subject || '',
          notes: data.notes || '',
          terms: data.terms || '',
          expectedDate: data.expectedDate ? data.expectedDate.split('T')[0] : '',
          discountPercent: data.discountPercent || 0,
          taxPercent: data.taxPercent ?? 5,
          items: data.items.map((item: { product: { id: string } | null; description: string; quantity: number; unitPrice: number }) => ({
            productId: item.product?.id || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });

        setItems(
          data.items.map((item: { product: { id: string } | null; description: string; quantity: number; unitPrice: number }) => ({
            productId: item.product?.id || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          }))
        );
      } catch {
        toast.error(t('common.error'));
        router.push(`/${locale}/purchase-orders`);
      } finally {
        setIsFetching(false);
      }
    };

    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers?limit=200');
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        setSuppliers(data.data || []);
      } catch {
        toast.error(t('common.error'));
      } finally {
        setLoadingSuppliers(false);
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/inventory?limit=200');
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        setProducts(data.data || []);
      } catch {
        toast.error(t('common.error'));
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchPO();
    fetchSuppliers();
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addItem = () => {
    setItems([...items, { productId: null, description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'productId' && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].description = product.name;
        updated[index].unitPrice = product.unitPrice;
      }
    }

    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountPercent = form.watch('discountPercent') || 0;
  const taxPercent = form.watch('taxPercent') || 0;
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const grandTotal = afterDiscount + taxAmount;

  const formatAmount = (val: number) => {
    return val.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const onSubmit = async (data: UpdatePurchaseOrderInput) => {
    const validItems = items.filter((item) => item.description.trim() !== '');
    if (validItems.length === 0) {
      toast.error(t('purchaseOrders.atLeastOneItem'));
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        ...data,
        expectedDate: data.expectedDate || null,
        items: validItems,
      };

      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('messages.notFound', { entity: t('purchaseOrders.title') }));
          router.push(`/${locale}/purchase-orders`);
          return;
        }
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to update purchase order');
      }

      toast.success(t('messages.updateSuccess', { entity: t('purchaseOrders.title') }));
      router.push(`/${locale}/purchase-orders/${id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.setValue('items', items);
    form.handleSubmit(onSubmit)();
  };

  if (isFetching) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <PageSkeleton />
        </div>
      </div>
    );
  }

  if (notDraft) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground mb-4">{t('purchaseOrders.onlyDraftEditable')}</p>
            <Button variant="outline" onClick={() => router.push(`/${locale}/purchase-orders/${id}`)}>
              <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />
              {t('common.back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <PageHeader
        title={t('purchaseOrders.edit')}
        icon={ShoppingCart}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/purchase-orders/${id}`)}>
            <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-5">
      <Form {...form}>
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* General Info */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="size-4 text-primary" />
                {t('purchaseOrders.details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Supplier */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Truck className="size-3.5" />
                        {t('purchaseOrders.supplier')} *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingSuppliers}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingSuppliers ? t('common.loading') : t('purchaseOrders.selectSupplier')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Expected Date */}
                <FormField
                  control={form.control}
                  name="expectedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {t('purchaseOrders.expectedDate')}
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subject */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="flex items-center gap-1.5">
                        <FileText className="size-3.5" />
                        {t('purchaseOrders.subject')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder={t('purchaseOrders.subject')} />
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
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <Package className="size-4 text-primary" />
                  {t('purchaseOrders.items')}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-4 me-1" />
                  {t('purchaseOrders.addItem')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border border-border/60 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(index)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Product */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('purchaseOrders.product')}</label>
                        <Select
                          value={item.productId || 'none'}
                          onValueChange={(val) => updateItem(index, 'productId', val === 'none' ? null : val)}
                          disabled={loadingProducts}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('purchaseOrders.selectProduct')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('purchaseOrders.noProduct')}</SelectItem>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('purchaseOrders.description')} *</label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder={t('purchaseOrders.description')}
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('purchaseOrders.quantity')}</label>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      {/* Unit Price */}
                      <div>
                        <label className="text-sm font-medium mb-1 block">{t('purchaseOrders.unitPrice')}</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="text-end text-sm text-muted-foreground">
                      {t('purchaseOrders.lineTotal')}: <span className="font-bold text-foreground">{formatAmount(item.quantity * item.unitPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Discount, Tax & Totals */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {t('purchaseOrders.totals')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Discount */}
                <FormField
                  control={form.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('purchaseOrders.discountPercent')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tax */}
                <FormField
                  control={form.control}
                  name="taxPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('purchaseOrders.taxPercent')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...field}
                          value={field.value ?? 5}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('purchaseOrders.subtotal')}</span>
                  <span className="font-bold">{formatAmount(subtotal)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>{t('purchaseOrders.discount')} ({discountPercent}%)</span>
                    <span>-{formatAmount(discountAmount)}</span>
                  </div>
                )}
                {taxPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('purchaseOrders.tax')} ({taxPercent}%)</span>
                    <span>{formatAmount(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-extrabold">{t('purchaseOrders.grandTotal')}</span>
                  <span className="font-extrabold text-primary">{formatAmount(grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                {t('purchaseOrders.notesAndTerms')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      {t('common.notes')}
                    </FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        value={field.value || ''}
                        placeholder={t('common.notes')}
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
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
                    <FormLabel className="flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      {t('purchaseOrders.terms')}
                    </FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        value={field.value || ''}
                        placeholder={t('purchaseOrders.terms')}
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/purchase-orders/${id}`)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="btn-premium" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="size-4 me-2 animate-spin" />
              ) : (
                <Save className="size-4 me-2" />
              )}
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
