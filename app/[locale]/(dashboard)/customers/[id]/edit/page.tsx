'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateCustomerSchema, UpdateCustomerInput, STATUS_PROBABILITY_MAP, LeadStatus } from '@/lib/validations/customer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
} from 'lucide-react';

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

  useEffect(() => {
    fetch('/api/users?limit=1000')
      .then((res) => res.json())
      .then((data) => setUsers(data.data))
      .catch(() => {});
  }, []);

  const form = useForm<UpdateCustomerInput>({
    resolver: zodResolver(updateCustomerSchema),
  });

  const watchEstimatedValue = form.watch('estimatedValue');
  const watchProbability = form.watch('probability');

  const weightedValue = (watchEstimatedValue || 0) * (watchProbability || 0) / 100;

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${id}`);

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || t('common.error'));
          router.push(`/${locale}/customers`);
          return;
        }

        const { data } = await response.json();
        form.reset({
          fullName: data.fullName,
          phone: data.phone,
          email: data.email || '',
          company: data.company || '',
          contactPerson: data.contactPerson || '',
          nationalId: data.nationalId || '',
          customerType: data.customerType,
          status: data.status,
          emirate: data.emirate || '',
          projectType: data.projectType || '',
          productType: data.productType || '',
          leadSource: data.leadSource || '',
          estimatedValue: data.estimatedValue || null,
          probability: data.probability || null,
          consultant: data.consultant || '',
          paymentTerms: data.paymentTerms || '',
          projectSize: data.projectSize || null,
          notes: data.notes || '',
          lastFollowUp: data.lastFollowUp ? data.lastFollowUp.split('T')[0] : '',
          nextFollowUp: data.nextFollowUp ? data.nextFollowUp.split('T')[0] : '',
        });
      } catch (error) {
        toast.error(t('common.error'));
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
        toast.error(error.error || t('common.error'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('customers.title') }));
      router.push(`/${locale}/customers/${id}`);
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{t('customers.edit')}</h1>
          <p className="text-muted-foreground mt-1">{form.getValues('fullName')}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/customers/${id}`)}
        >
          <ArrowLeft className="size-4 me-2" />
          {t('common.back')}
        </Button>
      </div>

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
                  AED {weightedValue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('customers.estimatedValue')}</p>
                <p className="text-lg font-semibold">
                  AED {(watchEstimatedValue || 0).toLocaleString()}
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
                    {t('customers.fullName')} &amp; {t('common.phone')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Name */}
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.fullName')} *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} disabled={isLoading} className="ps-10" placeholder={t('customers.fullName')} />
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
                          <FormLabel>{t('common.phone')} *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} disabled={isLoading} className="ps-10" placeholder="+971" />
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

                    {/* National ID */}
                    <FormField
                      control={form.control}
                      name="nationalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.nationalId')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Hash className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} value={field.value || ''} disabled={isLoading} className="ps-10" placeholder={t('customers.nationalId')} />
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

                    {/* Customer Type */}
                    <FormField
                      control={form.control}
                      name="customerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.customerType')} *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('common.select')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="TYPE_A">{t('customers.typeA')}</SelectItem>
                              <SelectItem value="TYPE_B">{t('customers.typeB')}</SelectItem>
                              <SelectItem value="TYPE_C">{t('customers.typeC')}</SelectItem>
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
                  <CardDescription>
                    {t('customers.projectType')} &amp; {t('customers.productType')}
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
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder="m²"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Consultant */}
                    <FormField
                      control={form.control}
                      name="consultant"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('customers.consultant')}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <UserCheck className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                              <Input {...field} value={field.value || ''} disabled={isLoading} className="ps-10" placeholder={t('customers.consultant')} />
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

            {/* === Lead & Sales Info Tab === */}
            <TabsContent value="lead">
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="size-5 text-primary" />
                    {t('customers.leadInfo')}
                  </CardTitle>
                  <CardDescription>
                    {t('customers.leadSource')} &amp; {t('customers.estimatedValue')}
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
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder="AED"
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
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                {...field}
                                value={field.value ?? ''}
                                onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                disabled={isLoading}
                                className="ps-10"
                                placeholder="%"
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
                        <TrendingUp className="size-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          AED {weightedValue.toLocaleString()}
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
                      {t('customers.lastFollowUp')} &amp; {t('customers.nextFollowUp')}
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
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
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
  );
}
