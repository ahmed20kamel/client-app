'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CITY_TRANSLATION_KEY, areaTranslationKey, type City } from '@/lib/locations';
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
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { CopyablePhone } from '@/components/CopyablePhone';
import { StatusBadge } from '@/components/StatusBadge';

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
  city: string | null;
  area: string | null;
  basin: string | null;
  projectType: string | null;
  productType: string | null;
  leadSource: string | null;
  estimatedValue: number | null;
  probability: number | null;
  weightedValue: number | null;
  consultant: string | null;
  consultantContactPerson: string | null;
  consultantPhone: string | null;
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

const TASK_STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  OPEN: { icon: Clock, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  DONE: { icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  OVERDUE: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  CANCELED: { icon: XCircle, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
  LOW: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  MEDIUM: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  HIGH: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
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
      toast.error(t('errors.networkError'));
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
      } catch {
        toast.error(t('errors.networkError'));
        router.push(`/${locale}/customers`);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
    fetchAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, t, router, locale]);

  if (loading) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </div>
        </div>
      </div>
    );
  }

  const InfoItem = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | number | null | undefined }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
          <p className="text-sm font-bold">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/customers`)}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{customer.fullName}</h1>
              <StatusBadge
                status={customer.status}
                label={t(`customers.${STATUS_TRANSLATION_MAP[customer.status] || 'statusNewInquiry'}`)}
              />
            </div>
            {customer.fullNameAr && (
              <p className="text-muted-foreground mt-0.5" dir="rtl">{customer.fullNameAr}</p>
            )}
          </div>
        </div>
        <Link href={`/${locale}/customers/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            {t('common.edit')}
          </Button>
        </Link>
      </div>

      <div className="p-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Summary Card */}
          <Card className="shadow-premium">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border-4 border-primary/20 shadow-lg mb-4">
                {customer.fullName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold">{customer.fullName}</h2>
              {customer.company && (
                <p className="text-sm text-muted-foreground">{customer.company}</p>
              )}

              <div className="w-full mt-5 space-y-3 text-start">
                {customer.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <CopyablePhone phone={customer.phone} />
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.emirate && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <span>{t(`customers.${EMIRATE_TRANSLATION_MAP[customer.emirate]}`)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <UserCheck className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{customer.owner.fullName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {new Date(customer.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <Card className="shadow-premium">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('customers.estimatedValue')}</span>
                <span className="text-sm font-bold">{customer.estimatedValue ? customer.estimatedValue.toLocaleString() : '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('customers.weightedValue')}</span>
                <span className="text-sm font-bold">{customer.weightedValue ? customer.weightedValue.toLocaleString() : '0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('customers.probability')}</span>
                <span className="text-sm font-bold">{customer.probability ?? 0}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Card className="shadow-premium">
            <Tabs defaultValue="info">
              <TabsList className="w-full border-b border-border rounded-none bg-muted/40 p-0 h-auto flex overflow-x-auto" variant="line">
                <TabsTrigger value="info" className="py-3 px-4 text-sm font-medium gap-1.5">
                  <User className="size-4" />
                  {t('customers.basicInfo')}
                </TabsTrigger>
                <TabsTrigger value="project" className="py-3 px-4 text-sm font-medium gap-1.5">
                  <Briefcase className="size-4" />
                  {t('customers.projectDetails')}
                </TabsTrigger>
                <TabsTrigger value="lead" className="py-3 px-4 text-sm font-medium gap-1.5">
                  <Target className="size-4" />
                  {t('customers.leadInfo')}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="py-3 px-4 text-sm font-medium gap-1.5">
                  <ListTodo className="size-4" />
                  {t('tasks.title')} ({customer.tasks.length})
                </TabsTrigger>
                <TabsTrigger value="attachments" className="py-3 px-4 text-sm font-medium gap-1.5">
                  <Paperclip className="size-4" />
                  {t('attachments.title')} ({attachments.length})
                </TabsTrigger>
              </TabsList>

          {/* === Basic Info Tab === */}
          <TabsContent value="info" className="p-6 sm:p-8">
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  {t('customers.basicInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InfoItem icon={User} label={t('customers.fullNameEn')} value={customer.fullName} />
                  <InfoItem icon={User} label={t('customers.fullNameAr')} value={customer.fullNameAr} />
                  {customer.phone && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                        <Phone className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground font-medium">{t('common.phone')}</p>
                        <CopyablePhone phone={customer.phone} className="text-sm font-bold" />
                      </div>
                    </div>
                  )}
                  <InfoItem icon={UserCheck} label={t('customers.contactPerson')} value={customer.contactPerson} />
                  <InfoItem icon={Mail} label={t('common.email')} value={customer.email} />
                  <InfoItem icon={Building2} label={t('customers.company')} value={customer.company} />
                  <InfoItem icon={Hash} label={t('customers.nationalId')} value={customer.nationalId} />
                  <InfoItem icon={MapPin} label={t('customers.emirate')} value={customer.emirate ? t(`customers.${EMIRATE_TRANSLATION_MAP[customer.emirate]}`) : null} />
                  <InfoItem icon={MapPin} label={t('customers.city')} value={customer.city ? t(`customers.cities.${CITY_TRANSLATION_KEY[customer.city as City]}`) : null} />
                  <InfoItem icon={MapPin} label={t('customers.area')} value={customer.area ? t(`customers.areas.${areaTranslationKey(customer.area)}`) : null} />
                  <InfoItem icon={MapPin} label={t('customers.basin')} value={customer.basin} />
                  <InfoItem icon={User} label={t('customers.customerType')} value={customer.customerType === 'NEW' ? t('customers.typeNew') : customer.customerType === 'EXISTING' ? t('customers.typeExisting') : customer.customerType} />
                  <InfoItem icon={UserCheck} label={t('customers.owner')} value={customer.owner.fullName} />
                  <InfoItem icon={User} label={t('customers.createdBy')} value={customer.createdBy.fullName} />
                  <InfoItem icon={Calendar} label={t('common.createdAt')} value={new Date(customer.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')} />
                </div>
              </div>

              {customer.notes && (
                <div>
                  <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    {t('common.notes')}
                  </h3>
                  <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{customer.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* === Project Details Tab === */}
          <TabsContent value="project" className="p-6 sm:p-8">
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
                  <Briefcase className="size-4 text-primary" />
                  {t('customers.projectDetails')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InfoItem icon={Briefcase} label={t('customers.projectType')} value={customer.projectType ? t(`customers.${PROJECT_TYPE_MAP[customer.projectType]}`) : null} />
                  <InfoItem icon={Briefcase} label={t('customers.productType')} value={customer.productType ? t(`customers.${PRODUCT_TYPE_MAP[customer.productType]}`) : null} />
                  <InfoItem icon={Ruler} label={t('customers.projectSize')} value={customer.projectSize ? `${customer.projectSize} m\u00B2` : null} />
                  <InfoItem icon={CreditCard} label={t('customers.paymentTerms')} value={customer.paymentTerms} />
                </div>
              </div>

              {(customer.consultant || customer.consultantContactPerson || customer.consultantPhone) && (
                <div>
                  <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    {t('customers.consultantSection')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <InfoItem icon={UserCheck} label={t('customers.consultantName')} value={customer.consultant} />
                    <InfoItem icon={User} label={t('customers.consultantContactPerson')} value={customer.consultantContactPerson} />
                    {customer.consultantPhone ? (
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted/50 mt-0.5 shrink-0">
                          <Phone className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[11px] text-muted-foreground font-medium">{t('customers.consultantPhone')}</p>
                          <CopyablePhone phone={customer.consultantPhone} className="text-sm font-bold" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* === Lead & Sales Tab === */}
          <TabsContent value="lead" className="p-6 sm:p-8">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <Target className="size-4 text-primary" />
              {t('customers.leadInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoItem icon={Megaphone} label={t('customers.leadSource')} value={customer.leadSource ? t(`customers.${LEAD_SOURCE_MAP[customer.leadSource]}`) : null} />
              <InfoItem icon={DollarSign} label={t('customers.estimatedValue')} value={customer.estimatedValue ? `${t('common.currency')} ${customer.estimatedValue.toLocaleString()}` : null} />
              <InfoItem icon={Percent} label={t('customers.probability')} value={customer.probability != null ? `${customer.probability}%` : null} />
              <InfoItem icon={TrendingUp} label={t('customers.weightedValue')} value={customer.weightedValue ? `${t('common.currency')} ${customer.weightedValue.toLocaleString()}` : null} />
              <InfoItem icon={Calendar} label={t('customers.lastFollowUp')} value={customer.lastFollowUp ? new Date(customer.lastFollowUp).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE') : null} />
              <InfoItem icon={Calendar} label={t('customers.nextFollowUp')} value={customer.nextFollowUp ? new Date(customer.nextFollowUp).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE') : null} />
            </div>
          </TabsContent>

          {/* === Tasks Tab === */}
          <TabsContent value="tasks" className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <ListTodo className="size-4 text-primary" />
                {t('tasks.title')}
              </h3>
              <Link href={`/${locale}/tasks/new?customerId=${id}`}>
                <Button size="sm" className="btn-premium">
                  <Plus className="size-4 me-1.5" />
                  {t('tasks.create')}
                </Button>
              </Link>
            </div>

            {customer.tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <ListTodo className="size-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">{t('tasks.noTasks')}</p>
                <Link href={`/${locale}/tasks/new?customerId=${id}`}>
                  <Button variant="outline" size="sm" className="mt-4">
                    <Plus className="size-4 me-1.5" />
                    {t('tasks.create')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {customer.tasks.map((task) => {
                  const statusConfig = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.OPEN;
                  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Link
                      key={task.id}
                      href={`/${locale}/tasks/${task.id}`}
                      className="block px-5 py-4 rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <StatusIcon className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          <h3 className="text-sm font-bold group-hover:text-primary transition-colors truncate">{task.title}</h3>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.color} border px-3 py-1 rounded-full text-xs font-bold`}>
                            {t(`tasks.status${task.status.charAt(0) + task.status.slice(1).toLowerCase()}`)}
                          </Badge>
                          <Badge variant="outline" className={`${priorityConfig.bg} ${priorityConfig.color} border px-3 py-1 rounded-full text-xs font-bold`}>
                            {t(`tasks.priority${task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}`)}
                          </Badge>
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2 ps-[26px]">{task.description}</p>
                      )}
                      <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-muted-foreground ps-[26px]">
                        <span className="flex items-center gap-1.5">
                          <UserCheck className="size-3 shrink-0" />
                          {task.assignedTo.fullName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3 shrink-0" />
                          {new Date(task.dueAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === Attachments Tab === */}
          <TabsContent value="attachments" className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                <Paperclip className="size-4 text-primary" />
                {t('attachments.title')}
              </h3>
              <Link href={`/${locale}/customers/${id}/edit`}>
                <Button size="sm" variant="outline">
                  <Plus className="size-4 me-1.5" />
                  {t('common.edit')}
                </Button>
              </Link>
            </div>

            {attachmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-12">
                <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Paperclip className="size-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">{t('attachments.noAttachments')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(['CLIENT_DOCS', 'QUOTATIONS', 'DRAWINGS'] as const).map((category) => {
                  const categoryAttachments = attachments.filter(a => a.category === category);
                  if (categoryAttachments.length === 0) return null;
                  return (
                    <div key={category}>
                      <h4 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <File className="size-3.5" />
                        {t(`attachments.${CATEGORY_LABELS[category]}`)}
                        <span className="font-normal normal-case tracking-normal">({categoryAttachments.length})</span>
                      </h4>
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
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
                              <p className="text-sm font-bold truncate" title={attachment.originalName}>
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
                                  onClick={(e) => { e.preventDefault(); handleDeleteAttachment(attachment.id); }}
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
          </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
