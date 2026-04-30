'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateCustomerSchema, UpdateCustomerInput, STATUS_PROBABILITY_MAP, LeadStatus } from '@/lib/validations/customer';
import { EMIRATES, EMIRATE_LABEL, EMIRATE_CITIES, type Emirate } from '@/lib/locations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  ArrowLeft,
  Save,
  Loader2,
  Target,
  Percent,
  CreditCard,
  Ruler,
  Megaphone,
  UserCheck,
  Hash,
  Languages,
  UserCog,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { FileUploadZone } from '@/components/FileUploadZone';
import { PhoneInput } from '@/components/PhoneInput';
import { EmiratesIdInput } from '@/components/EmiratesIdInput';
import { NumberInput } from '@/components/NumberInput';
import { getApiErrorMessage } from '@/lib/api-error';
import { Paperclip, FolderOpen, FileSpreadsheet } from 'lucide-react';

interface SystemUser {
  id: string;
  fullName: string;
}

export default function EditCustomerPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [users, setUsers] = useState<SystemUser[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/users?limit=1000')
      .then((res) => res.json())
      .then((data) => setUsers(data.data))
      .catch(() => {});
  }, []);

  const fetchAttachments = () => {
    fetch(`/api/customers/${id}/attachments`)
      .then(res => res.json())
      .then(data => setAttachments(data.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    fetchAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const form = useForm<UpdateCustomerInput>({
    resolver: zodResolver(updateCustomerSchema),
  });

  const watchEstimatedValue = form.watch('estimatedValue');
  const watchProbability = form.watch('probability');
  const watchedEmirate = form.watch('emirate') as Emirate | '';
  const availableCities = watchedEmirate && EMIRATE_CITIES[watchedEmirate] ? EMIRATE_CITIES[watchedEmirate] : [];

  const weightedValue = (watchEstimatedValue || 0) * (watchProbability || 0) / 100;

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast.error(t('messages.notFound', { entity: t('customers.title') }));
          } else if (response.status === 403) {
            toast.error(t('messages.unauthorized'));
          } else {
            const error = await response.json();
            toast.error(getApiErrorMessage(error.error || '', t));
          }
          router.push(`/${locale}/customers`);
          return;
        }

        const { data } = await response.json();
        form.reset({
          fullName: data.fullName,
          fullNameAr: data.fullNameAr || '',
          phone: data.phone,
          email: data.email || '',
          company: data.company || '',
          contactPerson: data.contactPerson || '',
          nationalId: data.nationalId || '',
          customerType: data.customerType,
          status: data.status,
          emirate: data.emirate || '',
          city: data.city || '',
          area: data.area || '',
          basin: data.basin || '',
          projectType: data.projectType || '',
          productType: data.productType || '',
          leadSource: data.leadSource || '',
          estimatedValue: data.estimatedValue || null,
          probability: data.probability || null,
          consultant: data.consultant || '',
          consultantContactPerson: data.consultantContactPerson || '',
          consultantPhone: data.consultantPhone || '',
          paymentTerms: data.paymentTerms || '',
          projectSize: data.projectSize || null,
          notes: data.notes || '',
          lastFollowUp: data.lastFollowUp ? data.lastFollowUp.split('T')[0] : '',
          nextFollowUp: data.nextFollowUp ? data.nextFollowUp.split('T')[0] : '',
        });
      } catch {
        toast.error(t('errors.networkError'));
        router.push(`/${locale}/customers`);
      } finally {
        setIsFetching(false);
      }
    };

    fetchCustomer();
  }, [id, form, t, router, locale]);

  const onSubmit = async (data: UpdateCustomerInput) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        estimatedValue: data.estimatedValue ? Number(data.estimatedValue) : null,
        probability: data.probability ? Number(data.probability) : null,
        projectSize: data.projectSize ? Number(data.projectSize) : null,
      };

      const response = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(getApiErrorMessage(error.error || '', t));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('customers.title') }));
      router.push(`/${locale}/customers/${id}`);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        icon={UserCog}
        title={t('customers.edit')}
        subtitle={form.getValues('fullName')}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/customers/${id}`)}
          >
            <ArrowLeft className="size-4 me-2 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-5 space-y-5">
      {/* Weighted Value Summary Card */}
      <Card className="mb-6 border-primary/20 shadow-premium">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <TrendingUp className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('customers.weightedValue')}</p>
                <p className="text-2xl font-bold text-primary">
                  {t('common.currency')} {weightedValue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('customers.estimatedValue')}</p>
                <p className="text-lg font-semibold">
                  {t('common.currency')} {(watchEstimatedValue || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-2xl text-muted-foreground/40 font-light">&times;</div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('customers.probability')}</p>
                <Badge variant="secondary" className="text-base px-3 py-0.5">
                  {watchProbability || 0}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="w-full justify-start" variant="line">
              <TabsTrigger value="basic">
                <User className="size-4 me-1.5" />
                {t('customers.basicInfo')}
              </TabsTrigger>
              <TabsTrigger value="project">
                <Briefcase className="size-4 me-1.5" />
                {t('customers.projectDetails')}
              </TabsTrigger>
              <TabsTrigger value="lead">
                <Target className="size-4 me-1.5" />
                {t('customers.leadInfo')}
              </TabsTrigger>
              <TabsTrigger value="followup">
                <Calendar className="size-4 me-1.5" />
                {t('customers.followUpInfo')}
              </TabsTrigger>
              <TabsTrigger value="attachments">
                <Paperclip className="size-4 me-1.5" />
                {t('attachments.title')}
                {attachments.length > 0 && (
                  <span className="ms-1.5 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                    {attachments.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* === Basic Information Tab === */}
            <TabsContent value="basic">
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="size-5 text-primary" />
                    {t('customers.basicInfo')}
                  </CardTitle>
                  <CardDescription>
                    {t('customers.fullName')} {t('common.and')} {t('common.phone')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name (English) */}
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.fullNameEn')} *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} disabled={isLoading} className="ps-10" placeholder="Customer Name" dir="ltr" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Full Name (Arabic) */}
                    <FormField
                      control={form.control}
                      name="fullNameAr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.fullNameAr')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Languages className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} value={field.value || ''} disabled={isLoading} className="ps-10" placeholder="اسم العميل" dir="rtl" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Company */}
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.company')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} value={field.value || ''} disabled={isLoading} className="ps-10" placeholder={t('customers.company')} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Contact Person (from system users) */}
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.contactPerson')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={users.map((user) => ({
                                value: user.fullName,
                                label: user.fullName,
                              }))}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              placeholder={t('common.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={isLoading}
                              icon={<UserCheck className="size-4 text-muted-foreground" />}
                            />
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
                          <FormLabel>{t('common.phone')} *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <PhoneInput
                                value={field.value || ''}
                                onChange={field.onChange}
                                disabled={isLoading}
                                className="ps-10"
                              />
                            </div>
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
                          <FormLabel>{t('common.email')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} value={field.value || ''} type="email" disabled={isLoading} className="ps-10" placeholder="email@example.com" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* National ID (Emirates ID) */}
                    <FormField
                      control={form.control}
                      name="nationalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.nationalId')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Hash className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <EmiratesIdInput
                                value={field.value || ''}
                                onChange={field.onChange}
                                disabled={isLoading}
                                className="ps-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Emirate */}
                    <FormField
                      control={form.control}
                      name="emirate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.emirate')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={EMIRATES.map(em => ({ value: em, label: EMIRATE_LABEL[em] }))}
                              value={field.value || ''}
                              onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue('city', '');
                              }}
                              placeholder={t('common.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={isLoading}
                              icon={<MapPin className="size-4 text-muted-foreground" />}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* City — cascades from emirate */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.city')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={availableCities.map(city => ({ value: city, label: city }))}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              placeholder={watchedEmirate ? t('common.select') : t('customers.selectEmirateFirst')}
                              searchPlaceholder={t('common.search')}
                              disabled={isLoading || !watchedEmirate}
                              icon={<MapPin className="size-4 text-muted-foreground" />}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Area — free text */}
                    <FormField
                      control={form.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.area')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input
                                {...field}
                                value={field.value || ''}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder={t('customers.area')}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Basin */}
                    <FormField
                      control={form.control}
                      name="basin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.basin')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input
                                {...field}
                                value={field.value || ''}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder={t('customers.basin')}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Customer Type */}
                    <FormField
                      control={form.control}
                      name="customerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.customerType')} *</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={[
                                { value: 'NEW', label: t('customers.typeNew') },
                                { value: 'EXISTING', label: t('customers.typeExisting') },
                              ]}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder={t('common.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* === Project Details Tab === */}
            <TabsContent value="project">
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="size-5 text-primary" />
                    {t('customers.projectDetails')}
                  </CardTitle>
                  <CardDescription>
                    {t('customers.projectType')} {t('common.and')} {t('customers.productType')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Project Type */}
                    <FormField
                      control={form.control}
                      name="projectType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.projectType')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={[
                                { value: 'VILLA', label: t('customers.projectTypes.villa') },
                                { value: 'ANNEX', label: t('customers.projectTypes.annex') },
                                { value: 'GUARD_ROOM', label: t('customers.projectTypes.guardRoom') },
                                { value: 'WAREHOUSE', label: t('customers.projectTypes.warehouse') },
                                { value: 'OFFICE', label: t('customers.projectTypes.office') },
                                { value: 'COMMERCIAL', label: t('customers.projectTypes.commercial') },
                                { value: 'RESIDENTIAL', label: t('customers.projectTypes.residential') },
                                { value: 'OTHER', label: t('customers.projectTypes.other') },
                              ]}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              placeholder={t('common.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={isLoading}
                              icon={<Briefcase className="size-4 text-muted-foreground" />}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Product Type */}
                    <FormField
                      control={form.control}
                      name="productType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.productType')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={[
                                { value: 'FRAMIX_LGSF', label: t('customers.productTypes.framixLgsf') },
                                { value: 'OTHER', label: t('customers.productTypes.other') },
                              ]}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              placeholder={t('common.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Project Size */}
                    <FormField
                      control={form.control}
                      name="projectSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.projectSize')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Ruler className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <NumberInput
                                value={field.value}
                                onChange={field.onChange}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder="m²"
                                min={0}
                                step={0.01}
                                suffix="m²"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                </CardContent>
              </Card>

              {/* Consultant Section */}
              <Card className="shadow-premium mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="size-5 text-primary" />
                    {t('customers.consultantSection')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Consultant Name */}
                    <FormField
                      control={form.control}
                      name="consultant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.consultantName')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <UserCheck className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} value={field.value || ''} disabled={isLoading} className="ps-10" placeholder={t('customers.consultantName')} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Consultant Contact Person */}
                    <FormField
                      control={form.control}
                      name="consultantContactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.consultantContactPerson')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} value={field.value || ''} disabled={isLoading} className="ps-10" placeholder={t('customers.consultantContactPerson')} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Consultant Phone */}
                    <FormField
                      control={form.control}
                      name="consultantPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.consultantPhone')}</FormLabel>
                          <FormControl>
                            <PhoneInput
                              value={field.value || ''}
                              onChange={field.onChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* === Lead & Sales Info Tab === */}
            <TabsContent value="lead">
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="size-5 text-primary" />
                    {t('customers.leadInfo')}
                  </CardTitle>
                  <CardDescription>
                    {t('customers.leadSource')} {t('common.and')} {t('customers.estimatedValue')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Lead Source */}
                    <FormField
                      control={form.control}
                      name="leadSource"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.leadSource')}</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={[
                                { value: 'INSTAGRAM', label: t('customers.leadSources.instagram') },
                                { value: 'FACEBOOK', label: t('customers.leadSources.facebook') },
                                { value: 'WEBSITE', label: t('customers.leadSources.website') },
                                { value: 'CONSULTANT', label: t('customers.leadSources.consultant') },
                                { value: 'REFERRAL', label: t('customers.leadSources.referral') },
                                { value: 'EXHIBITION', label: t('customers.leadSources.exhibition') },
                                { value: 'COLD_CALL', label: t('customers.leadSources.coldCall') },
                                { value: 'OTHER', label: t('customers.leadSources.other') },
                              ]}
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              placeholder={t('common.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={isLoading}
                              icon={<Megaphone className="size-4 text-muted-foreground" />}
                            />
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
                          <FormLabel>{t('common.status')} *</FormLabel>
                          <FormControl>
                            <SearchableSelect
                              options={[
                                { value: 'NEW_INQUIRY', label: `${t('customers.statusNewInquiry')} (10%)` },
                                { value: 'QUOTATION_SENT', label: `${t('customers.statusQuotationSent')} (30%)` },
                                { value: 'TECHNICAL_DISCUSSION', label: `${t('customers.statusTechnicalDiscussion')} (50%)` },
                                { value: 'NEGOTIATION', label: `${t('customers.statusNegotiation')} (70%)` },
                                { value: 'FINAL_OFFER', label: `${t('customers.statusFinalOffer')} (85%)` },
                                { value: 'VERBAL_APPROVAL', label: `${t('customers.statusVerbalApproval')} (95%)` },
                                { value: 'WON', label: `${t('customers.statusWon')} (100%)` },
                                { value: 'LOST', label: `${t('customers.statusLost')} (0%)` },
                              ]}
                              value={field.value}
                              onValueChange={(value) => {
                                const newStatus = value as LeadStatus;
                                field.onChange(newStatus);
                                if (newStatus) {
                                  form.setValue('probability', STATUS_PROBABILITY_MAP[newStatus]);
                                }
                              }}
                              placeholder={t('common.select')}
                              searchPlaceholder={t('common.search')}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Estimated Value */}
                    <FormField
                      control={form.control}
                      name="estimatedValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.estimatedValue')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <NumberInput
                                value={field.value}
                                onChange={field.onChange}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder={t('common.currency')}
                                min={0}
                                step={0.01}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Probability */}
                    <FormField
                      control={form.control}
                      name="probability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.probability')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Percent className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <NumberInput
                                value={field.value}
                                onChange={field.onChange}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder="%"
                                min={0}
                                max={100}
                                suffix="%"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Weighted Value (calculated) */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('customers.weightedValue')}</label>
                      <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/50">
                        <TrendingUp className="size-4 text-success" />
                        <span className="font-semibold text-success">
                          {t('common.currency')} {weightedValue.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.paymentTerms')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CreditCard className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} value={field.value || ''} disabled={isLoading} className="ps-10" placeholder={t('customers.paymentTerms')} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* === Follow-up & Notes Tab === */}
            <TabsContent value="followup">
              <div className="space-y-6">
                <Card className="shadow-premium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="size-5 text-primary" />
                      {t('customers.followUpInfo')}
                    </CardTitle>
                    <CardDescription>
                      {t('customers.lastFollowUp')} {t('common.and')} {t('customers.nextFollowUp')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Last Follow-Up */}
                      <FormField
                        control={form.control}
                        name="lastFollowUp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('customers.lastFollowUp')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input type="date" {...field} value={field.value || ''} disabled={isLoading} className="ps-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Next Follow-Up */}
                      <FormField
                        control={form.control}
                        name="nextFollowUp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('customers.nextFollowUp')}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                <Input type="date" {...field} value={field.value || ''} disabled={isLoading} className="ps-10" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card className="shadow-premium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="size-5 text-primary" />
                      {t('common.notes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <textarea
                              {...field}
                              value={field.value || ''}
                              disabled={isLoading}
                              rows={5}
                              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                              placeholder={t('common.notes')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* === Attachments Tab === */}
            <TabsContent value="attachments">
              <div className="space-y-4">
                {/* Client Documents & Quotations side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="shadow-premium">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="size-4 text-primary" />
                        {t('attachments.clientDocs')}
                      </CardTitle>
                      <CardDescription className="text-xs">{t('attachments.clientDocsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FileUploadZone
                        customerId={id}
                        category="CLIENT_DOCS"
                        attachments={attachments}
                        onUploadComplete={fetchAttachments}
                        disabled={isLoading}
                      />
                    </CardContent>
                  </Card>

                  <Card className="shadow-premium">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileSpreadsheet className="size-4 text-success" />
                        {t('attachments.quotations')}
                      </CardTitle>
                      <CardDescription className="text-xs">{t('attachments.quotationsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FileUploadZone
                        customerId={id}
                        category="QUOTATIONS"
                        attachments={attachments}
                        onUploadComplete={fetchAttachments}
                        disabled={isLoading}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* BOQ, Specifications & Reports */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="shadow-premium">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileSpreadsheet className="size-4 text-orange-500" />
                        {t('attachments.boq')}
                      </CardTitle>
                      <CardDescription className="text-xs">{t('attachments.boqDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FileUploadZone
                        customerId={id}
                        category="BOQ"
                        attachments={attachments}
                        onUploadComplete={fetchAttachments}
                        disabled={isLoading}
                      />
                    </CardContent>
                  </Card>

                  <Card className="shadow-premium">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="size-4 text-violet-500" />
                        {t('attachments.specifications')}
                      </CardTitle>
                      <CardDescription className="text-xs">{t('attachments.specificationsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FileUploadZone
                        customerId={id}
                        category="SPECIFICATIONS"
                        attachments={attachments}
                        onUploadComplete={fetchAttachments}
                        disabled={isLoading}
                      />
                    </CardContent>
                  </Card>

                  <Card className="shadow-premium">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="size-4 text-amber-500" />
                        {t('attachments.reports')}
                      </CardTitle>
                      <CardDescription className="text-xs">{t('attachments.reportsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FileUploadZone
                        customerId={id}
                        category="REPORTS"
                        attachments={attachments}
                        onUploadComplete={fetchAttachments}
                        disabled={isLoading}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Drawings & Plans */}
                <Card className="shadow-premium">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FolderOpen className="size-4 text-info" />
                      {t('attachments.drawings')}
                    </CardTitle>
                    <CardDescription className="text-xs">{t('attachments.drawingsDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { key: 'ARCHITECTURAL', label: t('attachments.subcategories.architectural') },
                        { key: 'STRUCTURAL', label: t('attachments.subcategories.structural') },
                        { key: 'HVAC', label: t('attachments.subcategories.hvac') },
                        { key: 'ELECTRICAL', label: t('attachments.subcategories.electrical') },
                        { key: 'PLUMBING', label: t('attachments.subcategories.plumbing') },
                        { key: 'LANDSCAPE', label: t('attachments.subcategories.landscape') },
                        { key: 'SHOP_DRAWING', label: t('attachments.subcategories.shopDrawing') },
                        { key: 'OTHER_DRAWING', label: t('attachments.subcategories.otherDrawing') },
                      ].map(sub => (
                        <div key={sub.key}>
                          <h4 className="text-xs font-semibold text-foreground mb-1.5">{sub.label}</h4>
                          <FileUploadZone
                            customerId={id}
                            category="DRAWINGS"
                            subcategory={sub.key}
                            attachments={attachments}
                            onUploadComplete={fetchAttachments}
                            disabled={isLoading}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/customers/${id}`)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[140px] btn-premium">
              {isLoading ? (
                <>
                  <Loader2 className="size-4 me-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="size-4 me-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      </div>
      </div>
    </div>
  );
}
