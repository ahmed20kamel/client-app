'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomerSchema, CreateCustomerInput } from '@/lib/validations/customer';
import { CITIES, CITY_AREAS, CITY_TRANSLATION_KEY, areaTranslationKey, type City } from '@/lib/locations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { FileUploadZone } from '@/components/FileUploadZone';
import { PhoneInput } from '@/components/PhoneInput';
import { EmiratesIdInput } from '@/components/EmiratesIdInput';
import { NumberInput } from '@/components/NumberInput';
import { CustomerAutocomplete } from '@/components/CustomerAutocomplete';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  ArrowLeft,
  Save,
  Loader2,
  UserCheck,
  Hash,
  Briefcase,
  Target,
  Ruler,
  DollarSign,
  Percent,
  CreditCard,
  Megaphone,
  TrendingUp,
  Paperclip,
  FolderOpen,
  FileSpreadsheet,
  Languages,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

interface SystemUser {
  id: string;
  fullName: string;
}

type LeadStatus = 'NEW_INQUIRY' | 'QUOTATION_SENT' | 'TECHNICAL_DISCUSSION' | 'NEGOTIATION' | 'FINAL_OFFER' | 'VERBAL_APPROVAL' | 'WON' | 'LOST';

const STATUS_PROBABILITY_MAP: Record<LeadStatus, number> = {
  NEW_INQUIRY: 10,
  QUOTATION_SENT: 30,
  TECHNICAL_DISCUSSION: 50,
  NEGOTIATION: 70,
  FINAL_OFFER: 85,
  VERBAL_APPROVAL: 95,
  WON: 100,
  LOST: 0,
};

export default function CreateCustomerPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

  // Generate a stable temp session ID for uploading attachments before customer is saved
  const tempSessionId = useMemo(() => `temp_${crypto.randomUUID()}`, []);

  useEffect(() => {
    fetch('/api/users?limit=1000')
      .then((res) => res.json())
      .then((data) => setUsers(data.data))
      .catch(() => {});
  }, []);

  const fetchAttachments = () => {
    fetch(`/api/attachments/temp?sessionId=${tempSessionId}`)
      .then(res => res.json())
      .then(data => setAttachments(data.data || []))
      .catch(() => {});
  };

  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      status: 'NEW_INQUIRY',
      customerType: 'NEW',
      probability: 10,
      fullName: '',
      fullNameAr: '',
      phone: '+971',
      email: '',
      company: '',
      contactPerson: '',
      nationalId: '',
      emirate: '',
      city: '',
      area: '',
      basin: '',
      projectType: '',
      productType: '',
      leadSource: '',
      consultant: '',
      consultantContactPerson: '',
      consultantPhone: '',
      paymentTerms: '',
      notes: '',
      lastFollowUp: '',
      nextFollowUp: '',
    },
  });

  // Watch city to cascade area options
  const watchedCity = form.watch('city') as City | '';
  const availableAreas = watchedCity && CITY_AREAS[watchedCity] ? CITY_AREAS[watchedCity] : [];

  const handleExistingCustomerSelect = (customer: any) => {
    form.setValue('fullName', customer.fullName);
    form.setValue('fullNameAr', customer.fullNameAr || '');
    form.setValue('phone', customer.phone || '+971');
    form.setValue('email', customer.email || '');
    form.setValue('company', customer.company || '');
    form.setValue('contactPerson', customer.contactPerson || '');
    form.setValue('nationalId', customer.nationalId || '');
    form.setValue('customerType', 'EXISTING');
    form.setValue('emirate', customer.emirate || '');
    form.setValue('projectType', customer.projectType || '');
    form.setValue('productType', customer.productType || '');
    form.setValue('leadSource', customer.leadSource || '');
    form.setValue('consultant', customer.consultant || '');
    form.setValue('paymentTerms', customer.paymentTerms || '');
    if (customer.estimatedValue) form.setValue('estimatedValue', customer.estimatedValue);
    if (customer.probability) form.setValue('probability', customer.probability);
    if (customer.projectSize) form.setValue('projectSize', customer.projectSize);
    toast.success(t('customers.customerDataLoaded'));
  };

  const watchEstimatedValue = form.watch('estimatedValue');
  const watchProbability = form.watch('probability');
  const weightedValue = (Number(watchEstimatedValue) || 0) * (Number(watchProbability) || 0) / 100;

  const onSubmit = async (data: CreateCustomerInput) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        estimatedValue: data.estimatedValue ? Number(data.estimatedValue) : null,
        probability: data.probability ? Number(data.probability) : null,
        projectSize: data.projectSize ? Number(data.projectSize) : null,
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(getApiErrorMessage(error.error || '', t));
        return;
      }

      const { data: customer } = await response.json();

      // Link any uploaded temp attachments to the new customer
      if (attachments.length > 0) {
        await fetch('/api/attachments/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tempSessionId, customerId: customer.id }),
        });
      }

      toast.success(t('messages.createSuccess', { entity: t('customers.title') }));
      router.push(`/${locale}/customers/${customer.id}`);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <PageHeader
        icon={UserPlus}
        title={t('customers.create')}
        subtitle={t('customers.details')}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/customers`)}
          >
            <ArrowLeft className="size-4 me-2 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name (English) - with autocomplete */}
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.fullNameEn')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
                              <CustomerAutocomplete
                                value={field.value}
                                onChange={field.onChange}
                                onSelect={handleExistingCustomerSelect}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder="Customer Name"
                                dir="ltr"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Full Name (Arabic) - with autocomplete */}
                    <FormField
                      control={form.control}
                      name="fullNameAr"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.fullNameAr')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Languages className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
                              <CustomerAutocomplete
                                value={field.value || ''}
                                onChange={field.onChange}
                                onSelect={handleExistingCustomerSelect}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder="اسم العميل"
                                dir="rtl"
                              />
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
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                  <UserCheck className="size-4 text-muted-foreground" />
                                  <SelectValue placeholder={t('common.select')} />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.fullName}>
                                  {user.fullName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <FormLabel>{t('common.phone')}</FormLabel>
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
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                  <MapPin className="size-4 text-muted-foreground" />
                                  <SelectValue placeholder={t('common.select')} />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ABU_DHABI">{t('customers.emirates.abuDhabi')}</SelectItem>
                              <SelectItem value="DUBAI">{t('customers.emirates.dubai')}</SelectItem>
                              <SelectItem value="SHARJAH">{t('customers.emirates.sharjah')}</SelectItem>
                              <SelectItem value="AJMAN">{t('customers.emirates.ajman')}</SelectItem>
                              <SelectItem value="UMM_AL_QUWAIN">{t('customers.emirates.ummAlQuwain')}</SelectItem>
                              <SelectItem value="RAS_AL_KHAIMAH">{t('customers.emirates.rasAlKhaimah')}</SelectItem>
                              <SelectItem value="FUJAIRAH">{t('customers.emirates.fujairah')}</SelectItem>
                              <SelectItem value="AL_AIN">{t('customers.emirates.alAin')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* City */}
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.city')}</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('area', '');
                            }}
                            value={field.value || ''}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                  <MapPin className="size-4 text-muted-foreground" />
                                  <SelectValue placeholder={t('common.select')} />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CITIES.map((city) => (
                                <SelectItem key={city} value={city}>
                                  {t(`customers.cities.${CITY_TRANSLATION_KEY[city]}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Area */}
                    <FormField
                      control={form.control}
                      name="area"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.area')}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ''}
                            disabled={isLoading || !watchedCity}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                  <MapPin className="size-4 text-muted-foreground" />
                                  <SelectValue placeholder={t('common.select')} />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableAreas.map((area) => (
                                <SelectItem key={area} value={area}>
                                  {t(`customers.areas.${areaTranslationKey(area)}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <FormLabel>{t('customers.customerType')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NEW">{t('customers.typeNew')}</SelectItem>
                              <SelectItem value="EXISTING">{t('customers.typeExisting')}</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="size-4 text-muted-foreground" />
                                  <SelectValue placeholder={t('common.select')} />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="VILLA">{t('customers.projectTypes.villa')}</SelectItem>
                              <SelectItem value="ANNEX">{t('customers.projectTypes.annex')}</SelectItem>
                              <SelectItem value="GUARD_ROOM">{t('customers.projectTypes.guardRoom')}</SelectItem>
                              <SelectItem value="WAREHOUSE">{t('customers.projectTypes.warehouse')}</SelectItem>
                              <SelectItem value="OFFICE">{t('customers.projectTypes.office')}</SelectItem>
                              <SelectItem value="COMMERCIAL">{t('customers.projectTypes.commercial')}</SelectItem>
                              <SelectItem value="RESIDENTIAL">{t('customers.projectTypes.residential')}</SelectItem>
                              <SelectItem value="OTHER">{t('customers.projectTypes.other')}</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FRAMIX_LGSF">{t('customers.productTypes.framixLgsf')}</SelectItem>
                              <SelectItem value="OTHER">{t('customers.productTypes.other')}</SelectItem>
                            </SelectContent>
                          </Select>
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
                    {t('customers.leadSource')} {locale === 'ar' ? 'و' : '&'} {t('customers.estimatedValue')}
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
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <div className="flex items-center gap-2">
                                  <Megaphone className="size-4 text-muted-foreground" />
                                  <SelectValue placeholder={t('common.select')} />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="INSTAGRAM">{t('customers.leadSources.instagram')}</SelectItem>
                              <SelectItem value="FACEBOOK">{t('customers.leadSources.facebook')}</SelectItem>
                              <SelectItem value="WEBSITE">{t('customers.leadSources.website')}</SelectItem>
                              <SelectItem value="CONSULTANT">{t('customers.leadSources.consultant')}</SelectItem>
                              <SelectItem value="REFERRAL">{t('customers.leadSources.referral')}</SelectItem>
                              <SelectItem value="EXHIBITION">{t('customers.leadSources.exhibition')}</SelectItem>
                              <SelectItem value="COLD_CALL">{t('customers.leadSources.coldCall')}</SelectItem>
                              <SelectItem value="OTHER">{t('customers.leadSources.other')}</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Select
                            onValueChange={(value) => {
                              const newStatus = value as LeadStatus;
                              field.onChange(newStatus);
                              form.setValue('probability', STATUS_PROBABILITY_MAP[newStatus]);
                            }}
                            value={field.value}
                            disabled={isLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NEW_INQUIRY">{t('customers.statusNewInquiry')} (10%)</SelectItem>
                              <SelectItem value="QUOTATION_SENT">{t('customers.statusQuotationSent')} (30%)</SelectItem>
                              <SelectItem value="TECHNICAL_DISCUSSION">{t('customers.statusTechnicalDiscussion')} (50%)</SelectItem>
                              <SelectItem value="NEGOTIATION">{t('customers.statusNegotiation')} (70%)</SelectItem>
                              <SelectItem value="FINAL_OFFER">{t('customers.statusFinalOffer')} (85%)</SelectItem>
                              <SelectItem value="VERBAL_APPROVAL">{t('customers.statusVerbalApproval')} (95%)</SelectItem>
                              <SelectItem value="WON">{t('customers.statusWon')} (100%)</SelectItem>
                              <SelectItem value="LOST">{t('customers.statusLost')} (0%)</SelectItem>
                            </SelectContent>
                          </Select>
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
                      <div className="flex items-center gap-2 h-10 px-3 rounded-lg border bg-muted/50">
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
                  <CardContent className="pt-6">
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
                        tempSessionId={tempSessionId}
                        category="CLIENT_DOCS"
                        attachments={attachments}
                        onUploadComplete={fetchAttachments}
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
                        tempSessionId={tempSessionId}
                        category="QUOTATIONS"
                        attachments={attachments}
                        onUploadComplete={fetchAttachments}
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
                            tempSessionId={tempSessionId}
                            category="DRAWINGS"
                            subcategory={sub.key}
                            attachments={attachments}
                            onUploadComplete={fetchAttachments}
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
              onClick={() => router.push(`/${locale}/customers`)}
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
                    {t('common.create')}
                  </>
                )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
