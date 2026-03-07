'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  Pencil,
  Target,
  Percent,
  CreditCard,
  Ruler,
  Megaphone,
  UserCheck,
  Hash,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  ListTodo,
  Paperclip,
  Download,
  Trash2,
  File,
  Image as ImageIcon,
} from 'lucide-react';
import { PageSkeleton, DetailSkeleton } from '@/components/ui/page-skeleton';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'DONE' | 'OVERDUE' | 'CANCELED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueAt: string;
  assignedTo: {
    id: string;
    fullName: string;
  };
}

interface Attachment {
  id: string;
  category: string;
  subcategory: string | null;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  CLIENT_DOCS: 'clientDocs',
  DRAWINGS: 'drawings',
  QUOTATIONS: 'quotations',
};

interface Customer {
  id: string;
  fullName: string;
  fullNameAr: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  contactPerson: string | null;
  nationalId: string | null;
  customerType: string;
  status: string;
  emirate: string | null;
  projectType: string | null;
  productType: string | null;
  leadSource: string | null;
  estimatedValue: number | null;
  probability: number | null;
  weightedValue: number | null;
  consultant: string | null;
  paymentTerms: string | null;
  projectSize: number | null;
  lastFollowUp: string | null;
  nextFollowUp: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
  };
  createdBy: {
    id: string;
    fullName: string;
  };
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  NEW_INQUIRY: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  QUOTATION_SENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  TECHNICAL_DISCUSSION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  NEGOTIATION: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  FINAL_OFFER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  VERBAL_APPROVAL: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
  WON: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  LOST: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const STATUS_TRANSLATION_MAP: Record<string, string> = {
  NEW_INQUIRY: 'statusNewInquiry',
  QUOTATION_SENT: 'statusQuotationSent',
  TECHNICAL_DISCUSSION: 'statusTechnicalDiscussion',
  NEGOTIATION: 'statusNegotiation',
  FINAL_OFFER: 'statusFinalOffer',
  VERBAL_APPROVAL: 'statusVerbalApproval',
  WON: 'statusWon',
  LOST: 'statusLost',
};

const EMIRATE_TRANSLATION_MAP: Record<string, string> = {
  ABU_DHABI: 'emirates.abuDhabi',
  DUBAI: 'emirates.dubai',
  SHARJAH: 'emirates.sharjah',
  AJMAN: 'emirates.ajman',
  UMM_AL_QUWAIN: 'emirates.ummAlQuwain',
  RAS_AL_KHAIMAH: 'emirates.rasAlKhaimah',
  FUJAIRAH: 'emirates.fujairah',
  AL_AIN: 'emirates.alAin',
};

const PROJECT_TYPE_MAP: Record<string, string> = {
  VILLA: 'projectTypes.villa',
  ANNEX: 'projectTypes.annex',
  GUARD_ROOM: 'projectTypes.guardRoom',
  WAREHOUSE: 'projectTypes.warehouse',
  OFFICE: 'projectTypes.office',
  COMMERCIAL: 'projectTypes.commercial',
  RESIDENTIAL: 'projectTypes.residential',
  OTHER: 'projectTypes.other',
};

const PRODUCT_TYPE_MAP: Record<string, string> = {
  FRAMIX_LGSF: 'productTypes.framixLgsf',
  OTHER: 'productTypes.other',
};

const LEAD_SOURCE_MAP: Record<string, string> = {
  INSTAGRAM: 'leadSources.instagram',
  FACEBOOK: 'leadSources.facebook',
  WEBSITE: 'leadSources.website',
  CONSULTANT: 'leadSources.consultant',
  REFERRAL: 'leadSources.referral',
  EXHIBITION: 'leadSources.exhibition',
  COLD_CALL: 'leadSources.coldCall',
  OTHER: 'leadSources.other',
};

const TASK_STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string }> = {
  OPEN: { icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  DONE: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
  OVERDUE: { icon: AlertCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  CANCELED: { icon: XCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

const PRIORITY_CONFIG: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
};

export default function CustomerDetailsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const fetchAttachments = async () => {
    try {
      setAttachmentsLoading(true);
      const res = await fetch(`/api/customers/${id}/attachments`);
      if (res.ok) {
        const { data } = await res.json();
        setAttachments(data || []);
      }
    } catch {
      // silent
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/customers/${id}/attachments?attachmentId=${attachmentId}`, { method: 'DELETE' });
      if (res.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
        toast.success(t('messages.deleteSuccess', { entity: t('attachments.title') }));
      }
    } catch {
      toast.error(t('common.error'));
    }
  };

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${id}`);

        if (!response.ok) {
          if (response.status === 403) {
            toast.error(t('messages.unauthorized'));
            router.push(`/${locale}/customers`);
            return;
          }
          throw new Error('Failed to fetch customer');
        }

        const { data } = await response.json();
        setCustomer(data);
      } catch (error) {
        toast.error(t('common.error'));
        router.push(`/${locale}/customers`);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
    fetchAttachments();
  }, [id, t, router, locale]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!customer) {
    return <div className="text-center py-8 text-muted-foreground">{t('common.noData')}</div>;
  }

  const InfoItem = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | number | null | undefined }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-medium text-sm">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight truncate">{customer.fullName}</h1>
            {customer.fullNameAr && (
              <p className="text-lg text-muted-foreground truncate" dir="rtl">{customer.fullNameAr}</p>
            )}
          </div>
          <Badge className={`shrink-0 ${STATUS_COLORS[customer.status] || ''}`}>
            {t(`customers.${STATUS_TRANSLATION_MAP[customer.status] || 'statusNewInquiry'}`)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/customers/${id}/edit`}>
            <Button className="btn-premium">
              <Pencil className="size-4 me-2" />
              {t('common.edit')}
            </Button>
          </Link>
          <Button variant="outline" onClick={() => router.push(`/${locale}/customers`)}>
            <ArrowLeft className="size-4 me-2 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-premium border-primary/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                <Target className="size-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t('common.status')}</p>
                <Badge className={`mt-0.5 ${STATUS_COLORS[customer.status] || ''}`}>
                  {t(`customers.${STATUS_TRANSLATION_MAP[customer.status] || 'statusNewInquiry'}`)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-primary/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
                <Percent className="size-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t('customers.probability')}</p>
                <p className="text-xl font-bold">{customer.probability ?? 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-primary/10">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
                <DollarSign className="size-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t('customers.estimatedValue')}</p>
                <p className="text-xl font-bold truncate">{customer.estimatedValue ? `${t('common.currency')} ${customer.estimatedValue.toLocaleString()}` : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-green-500/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success/10 shrink-0">
                <TrendingUp className="size-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t('customers.weightedValue')}</p>
                <p className="text-xl font-bold text-success truncate">{customer.weightedValue ? `${t('common.currency')} ${customer.weightedValue.toLocaleString()}` : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="w-full justify-start" variant="line">
          <TabsTrigger value="info">
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
          <TabsTrigger value="tasks">
            <ListTodo className="size-4 me-1.5" />
            {t('tasks.title')} ({customer.tasks.length})
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <Paperclip className="size-4 me-1.5" />
            {t('attachments.title')} ({attachments.length})
          </TabsTrigger>
        </TabsList>

        {/* === Basic Info Tab === */}
        <TabsContent value="info">
          <div className="space-y-6">
            <Card className="shadow-premium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5 text-primary" />
                  {t('customers.basicInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InfoItem icon={User} label={t('customers.fullNameEn')} value={customer.fullName} />
                  <InfoItem icon={User} label={t('customers.fullNameAr')} value={customer.fullNameAr} />
                  <InfoItem icon={Phone} label={t('common.phone')} value={customer.phone} />
                  <InfoItem icon={UserCheck} label={t('customers.contactPerson')} value={customer.contactPerson} />
                  <InfoItem icon={Mail} label={t('common.email')} value={customer.email} />
                  <InfoItem icon={Building2} label={t('customers.company')} value={customer.company} />
                  <InfoItem icon={Hash} label={t('customers.nationalId')} value={customer.nationalId} />
                  <InfoItem icon={MapPin} label={t('customers.emirate')} value={customer.emirate ? t(`customers.${EMIRATE_TRANSLATION_MAP[customer.emirate]}`) : null} />
                  <InfoItem icon={User} label={t('customers.customerType')} value={customer.customerType === 'NEW' ? t('customers.typeNew') : customer.customerType === 'EXISTING' ? t('customers.typeExisting') : customer.customerType} />
                  <InfoItem icon={UserCheck} label={t('customers.owner')} value={customer.owner.fullName} />
                  <InfoItem icon={User} label={t('customers.createdBy')} value={customer.createdBy.fullName} />
                  <InfoItem icon={Calendar} label={t('common.createdAt')} value={new Date(customer.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')} />
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {customer.notes && (
              <Card className="shadow-premium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-5 text-primary" />
                    {t('common.notes')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{customer.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoItem icon={Briefcase} label={t('customers.projectType')} value={customer.projectType ? t(`customers.${PROJECT_TYPE_MAP[customer.projectType]}`) : null} />
                <InfoItem icon={Briefcase} label={t('customers.productType')} value={customer.productType ? t(`customers.${PRODUCT_TYPE_MAP[customer.productType]}`) : null} />
                <InfoItem icon={Ruler} label={t('customers.projectSize')} value={customer.projectSize ? `${customer.projectSize} m²` : null} />
                <InfoItem icon={UserCheck} label={t('customers.consultant')} value={customer.consultant} />
                <InfoItem icon={CreditCard} label={t('customers.paymentTerms')} value={customer.paymentTerms} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Lead & Sales Tab === */}
        <TabsContent value="lead">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-5 text-primary" />
                {t('customers.leadInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <InfoItem icon={Megaphone} label={t('customers.leadSource')} value={customer.leadSource ? t(`customers.${LEAD_SOURCE_MAP[customer.leadSource]}`) : null} />
                <InfoItem icon={DollarSign} label={t('customers.estimatedValue')} value={customer.estimatedValue ? `${t('common.currency')} ${customer.estimatedValue.toLocaleString()}` : null} />
                <InfoItem icon={Percent} label={t('customers.probability')} value={customer.probability != null ? `${customer.probability}%` : null} />
                <InfoItem icon={TrendingUp} label={t('customers.weightedValue')} value={customer.weightedValue ? `${t('common.currency')} ${customer.weightedValue.toLocaleString()}` : null} />
                <InfoItem icon={Calendar} label={t('customers.lastFollowUp')} value={customer.lastFollowUp ? new Date(customer.lastFollowUp).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE') : null} />
                <InfoItem icon={Calendar} label={t('customers.nextFollowUp')} value={customer.nextFollowUp ? new Date(customer.nextFollowUp).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE') : null} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Tasks Tab === */}
        <TabsContent value="tasks">
          <Card className="shadow-premium">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="size-5 text-primary" />
                  {t('tasks.title')}
                </CardTitle>
                <Link href={`/${locale}/tasks/new?customerId=${id}`}>
                  <Button size="sm" className="btn-premium">
                    <Plus className="size-4 me-1.5" />
                    {t('tasks.create')}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {customer.tasks.length === 0 ? (
                <div className="text-center py-12">
                  <ListTodo className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">{t('tasks.noTasks')}</p>
                  <Link href={`/${locale}/tasks/new?customerId=${id}`}>
                    <Button variant="outline" size="sm" className="mt-4">
                      <Plus className="size-4 me-1.5" />
                      {t('tasks.create')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {customer.tasks.map((task) => {
                    const statusConfig = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.OPEN;
                    const StatusIcon = statusConfig.icon;
                    return (
                      <Link
                        key={task.id}
                        href={`/${locale}/tasks/${task.id}`}
                        className="block p-4 rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <StatusIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            <h3 className="font-medium group-hover:text-primary transition-colors truncate">{task.title}</h3>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <span className={`px-2 py-0.5 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                              {t(`tasks.status${task.status.charAt(0) + task.status.slice(1).toLowerCase()}`)}
                            </span>
                            <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${PRIORITY_CONFIG[task.priority] || ''}`}>
                              {t(`tasks.priority${task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}`)}
                            </span>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2 ps-6">{task.description}</p>
                        )}
                        <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-muted-foreground ps-6">
                          <span className="flex items-center gap-1">
                            <UserCheck className="size-3 shrink-0" />
                            {task.assignedTo.fullName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 shrink-0" />
                            {new Date(task.dueAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Attachments Tab === */}
        <TabsContent value="attachments">
          <Card className="shadow-premium">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="size-5 text-primary" />
                  {t('attachments.title')}
                </CardTitle>
                <Link href={`/${locale}/customers/${id}/edit`}>
                  <Button size="sm" variant="outline">
                    <Plus className="size-4 me-1.5" />
                    {t('common.edit')}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {attachmentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : attachments.length === 0 ? (
                <div className="text-center py-12">
                  <Paperclip className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">{t('attachments.noAttachments')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group by category */}
                  {(['CLIENT_DOCS', 'QUOTATIONS', 'DRAWINGS'] as const).map((category) => {
                    const categoryAttachments = attachments.filter(a => a.category === category);
                    if (categoryAttachments.length === 0) return null;
                    return (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                          <File className="size-4" />
                          {t(`attachments.${CATEGORY_LABELS[category]}`)}
                          <span className="text-xs font-normal">({categoryAttachments.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryAttachments.map((attachment) => {
                            const isImage = attachment.mimeType.startsWith('image/');
                            const fileSize = attachment.fileSize < 1024 * 1024
                              ? `${(attachment.fileSize / 1024).toFixed(1)} KB`
                              : `${(attachment.fileSize / (1024 * 1024)).toFixed(1)} MB`;
                            return (
                              <div
                                key={attachment.id}
                                className="group relative border border-border/60 rounded-xl p-3 hover:border-primary/30 hover:shadow-md transition-all"
                              >
                                {isImage ? (
                                  <div className="mb-2 rounded-lg overflow-hidden bg-muted/30 aspect-video flex items-center justify-center">
                                    <img
                                      src={attachment.filePath}
                                      alt={attachment.originalName}
                                      className="object-contain max-h-full max-w-full"
                                    />
                                  </div>
                                ) : (
                                  <div className="mb-2 rounded-lg bg-muted/30 aspect-video flex items-center justify-center">
                                    <FileText className="size-8 text-muted-foreground/40" />
                                  </div>
                                )}
                                <p className="text-sm font-medium truncate" title={attachment.originalName}>
                                  {attachment.originalName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {fileSize} &middot; {new Date(attachment.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                                </p>
                                <div className="absolute top-2 end-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a
                                    href={attachment.filePath}
                                    download={attachment.originalName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border/60 hover:bg-primary/10 hover:text-primary transition-colors"
                                  >
                                    <Download className="size-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                    className="p-1.5 rounded-lg bg-background/80 backdrop-blur border border-border/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
