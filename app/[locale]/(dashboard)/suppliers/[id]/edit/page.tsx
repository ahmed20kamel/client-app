'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateSupplierSchema, UpdateSupplierInput } from '@/lib/validations/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  Truck,
  ArrowLeft,
  Save,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageSkeleton } from '@/components/ui/page-skeleton';

export default function EditSupplierPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const form = useForm<UpdateSupplierInput>({
    resolver: zodResolver(updateSupplierSchema),
  });

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/suppliers/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast.error(t('messages.notFound', { entity: t('suppliers.title') }));
          } else if (response.status === 403) {
            toast.error(t('messages.unauthorized'));
          }
          router.push(`/${locale}/suppliers`);
          return;
        }

        const { data } = await response.json();
        form.reset({
          name: data.name,
          nameAr: data.nameAr || '',
          contactPerson: data.contactPerson || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          notes: data.notes || '',
          status: data.status,
        });
      } catch {
        toast.error(t('common.error'));
        router.push(`/${locale}/suppliers`);
      } finally {
        setIsFetching(false);
      }
    };

    fetchSupplier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (data: UpdateSupplierInput) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('messages.notFound', { entity: t('suppliers.title') }));
          router.push(`/${locale}/suppliers`);
          return;
        }
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to update supplier');
      }

      toast.success(t('messages.updateSuccess', { entity: t('suppliers.title') }));
      router.push(`/${locale}/suppliers/${id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <PageHeader
        title={t('suppliers.edit')}
        icon={Truck}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/suppliers/${id}`)}>
            <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="size-4 text-primary" />
                {t('suppliers.details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Truck className="size-3.5" />
                        {t('suppliers.supplierName')} *
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder={t('suppliers.supplierName')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name Arabic */}
                <FormField
                  control={form.control}
                  name="nameAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Truck className="size-3.5" />
                        {t('suppliers.supplierNameAr')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder={t('suppliers.supplierNameAr')} dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Person */}
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <User className="size-3.5" />
                        {t('suppliers.contactPerson')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder={t('suppliers.contactPerson')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Phone className="size-3.5" />
                        {t('common.phone')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          type="tel"
                          inputMode="tel"
                          maxLength={20}
                          placeholder="+971 XX XXX XXXX"
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

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Mail className="size-3.5" />
                        {t('common.email')}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} placeholder={t('common.email')} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        {t('common.status')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.status')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">{t('suppliers.statusActive')}</SelectItem>
                          <SelectItem value="INACTIVE">{t('suppliers.statusInactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {t('suppliers.address')}
                    </FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        value={field.value || ''}
                        placeholder={t('suppliers.address')}
                        rows={3}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
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
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/suppliers/${id}`)}>
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
