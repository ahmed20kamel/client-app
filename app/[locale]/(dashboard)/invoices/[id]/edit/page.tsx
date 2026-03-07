'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateInvoiceSchema, UpdateInvoiceInput } from '@/lib/validations/invoice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  Receipt,
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Plus,
  Trash2,
  User,
  Calendar,
  Package,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageSkeleton } from '@/components/ui/page-skeleton';

interface Customer {
  id: string;
  name: string;
  fullName: string;
}

interface Product {
  id: string;
  name: string;
  sellingPrice: number;
}

interface LineItem {
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export default function EditInvoicePage() {
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
    { productId: null, description: '', quantity: 1, unitPrice: 0, discount: 0 },
  ]);
  const [notDraft, setNotDraft] = useState(false);

  const form = useForm<UpdateInvoiceInput>({
    resolver: zodResolver(updateInvoiceSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceRes, custRes, prodRes] = await Promise.all([
          fetch(`/api/invoices/${id}`),
          fetch('/api/customers?limit=1000'),
          fetch('/api/inventory?limit=1000'),
        ]);

        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(custData.data || []);
        }
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.data || []);
        }

        if (!invoiceRes.ok) {
          if (invoiceRes.status === 404) {
            toast.error(t('messages.notFound', { entity: t('invoices.title') }));
          } else if (invoiceRes.status === 403) {
            toast.error(t('messages.unauthorized'));
          }
          router.push(`/${locale}/invoices`);
          return;
        }

        const { data } = await invoiceRes.json();

        if (data.status !== 'DRAFT') {
          setNotDraft(true);
          setIsFetching(false);
          return;
        }

        form.reset({
          customerId: data.customerId,
          subject: data.subject || '',
          notes: data.notes || '',
          terms: data.terms || '',
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '',
          discountPercent: data.discountPercent || 0,
          taxPercent: data.taxPercent ?? 5,
        });

        if (data.items && data.items.length > 0) {
          setItems(
            data.items.map((item: { productId: string | null; description: string; quantity: number; unitPrice: number; discount: number }) => ({
              productId: item.productId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount || 0,
            }))
          );
        }
      } catch {
        toast.error(t('common.error'));
        router.push(`/${locale}/invoices`);
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const addItem = () => {
    setItems([...items, { productId: null, description: '', quantity: 1, unitPrice: 0, discount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number | null) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'productId' && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        updated[index].description = product.name;
        updated[index].unitPrice = product.sellingPrice || 0;
      }
    }
    setItems(updated);
  };

  const getLineTotal = (item: LineItem) => {
    const disc = item.discount || 0;
    return item.quantity * item.unitPrice * (1 - disc / 100);
  };

  const subtotal = items.reduce((sum, item) => sum + getLineTotal(item), 0);
  const discountPercent = form.watch('discountPercent') || 0;
  const taxPercent = form.watch('taxPercent') ?? 5;
  const discountAmount = subtotal * discountPercent / 100;
  const taxAmount = (subtotal - discountAmount) * taxPercent / 100;
  const total = subtotal - discountAmount + taxAmount;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const onSubmit = async (data: UpdateInvoiceInput) => {
    try {
      setIsLoading(true);
      const payload = {
        ...data,
        items: items.map((item) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
      };

      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('messages.notFound', { entity: t('invoices.title') }));
          router.push(`/${locale}/invoices`);
          return;
        }
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        const errorData = await response.json();
        toast.error(errorData.error || t('common.error'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('invoices.title') }));
      router.push(`/${locale}/invoices/${id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = () => {
    form.setValue('items', items.map((item) => ({
      productId: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
    })));
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
            <p className="text-muted-foreground mb-4">{t('invoices.onlyDraftEditable')}</p>
            <Button variant="outline" onClick={() => router.push(`/${locale}/invoices/${id}`)}>
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
        title={t('invoices.edit')}
        icon={Receipt}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/invoices/${id}`)}>
            <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-5">
      <Form {...form}>
        <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} className="space-y-6">
          {/* Invoice Details */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="size-4 text-primary" />
                {t('invoices.details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Customer */}
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <User className="size-3.5" />
                        {t('invoices.customer')} *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('invoices.selectCustomer')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.fullName || customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        {t('invoices.dueDate')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} type="date" />
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
                        {t('invoices.subject')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder={t('invoices.subject')} />
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
                  {t('invoices.items')}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-4 me-1" />
                  {t('invoices.addItem')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile Items */}
              <div className="md:hidden space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border border-border/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">#{index + 1}</span>
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(index)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                    <Select
                      value={item.productId || 'none'}
                      onValueChange={(val) => updateItem(index, 'productId', val === 'none' ? null : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('invoices.selectProduct')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('invoices.noProduct')}</SelectItem>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={t('invoices.description')}
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">{t('invoices.quantity')}</label>
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">{t('invoices.unitPrice')}</label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground font-medium">{t('invoices.discount')} %</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="text-end text-sm font-bold">
                      {t('invoices.lineTotal')}: {formatCurrency(getLineTotal(item))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Items Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider w-[200px]">
                        {t('invoices.product')}
                      </th>
                      <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                        {t('invoices.description')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider w-[100px]">
                        {t('invoices.quantity')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider w-[120px]">
                        {t('invoices.unitPrice')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider w-[100px]">
                        {t('invoices.discount')} %
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider w-[120px]">
                        {t('invoices.lineTotal')}
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider w-[60px]">
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <Select
                            value={item.productId || 'none'}
                            onValueChange={(val) => updateItem(index, 'productId', val === 'none' ? null : val)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('invoices.selectProduct')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t('invoices.noProduct')}</SelectItem>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            placeholder={t('invoices.description')}
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={item.discount}
                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-medium">
                          {formatCurrency(getLineTotal(item))}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {items.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(index)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-full md:w-80 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('invoices.subtotal')}</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{t('invoices.discountPercent')}</span>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={discountPercent}
                        onChange={(e) => form.setValue('discountPercent', parseFloat(e.target.value) || 0)}
                        className="text-center h-8 text-sm"
                      />
                    </div>
                    <span className="font-medium w-24 text-end">-{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{t('invoices.taxPercent')}</span>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={taxPercent}
                        onChange={(e) => form.setValue('taxPercent', parseFloat(e.target.value) || 0)}
                        className="text-center h-8 text-sm"
                      />
                    </div>
                    <span className="font-medium w-24 text-end">+{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-base font-bold">
                    <span>{t('invoices.total')}</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                {t('invoices.notesAndTerms')}
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
                      {t('invoices.terms')}
                    </FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        value={field.value || ''}
                        placeholder={t('invoices.terms')}
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
            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/invoices/${id}`)}>
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
