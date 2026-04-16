'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Truck,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { fmtAmount } from '@/lib/utils';

interface SupplierProduct {
  id: string;
  supplierSku: string | null;
  unitCost: number | null;
  leadTimeDays: number | null;
  product: {
    id: string;
    name: string;
    sku: string | null;
  };
}

interface Supplier {
  id: string;
  name: string;
  nameAr: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  products: SupplierProduct[];
}

export default function SupplierDetailsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/suppliers/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            toast.error(t('messages.notFound', { entity: t('suppliers.title') }));
            router.push(`/${locale}/suppliers`);
            return;
          }
          if (response.status === 403) {
            toast.error(t('messages.unauthorized'));
            router.push(`/${locale}/suppliers`);
            return;
          }
          throw new Error('Failed to fetch supplier');
        }

        const { data } = await response.json();
        setSupplier(data);
      } catch {
        toast.error(t('common.error'));
        router.push(`/${locale}/suppliers`);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [id, t, router, locale]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('suppliers.title') }));
      router.push(`/${locale}/suppliers`);
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (!supplier) {
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
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/suppliers`)}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{supplier.name}</h1>
              <StatusBadge
                status={supplier.status}
                label={supplier.status === 'ACTIVE' ? t('suppliers.statusActive') : t('suppliers.statusInactive')}
              />
            </div>
            {supplier.nameAr && (
              <p className="text-muted-foreground mt-0.5" dir="rtl">{supplier.nameAr}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/${locale}/suppliers/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="size-4 me-1" />
              {t('common.edit')}
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="size-4 me-1" />
                {t('common.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
                <AlertDialogDescription>{t('common.deleteConfirmDesc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Supplier Info */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              {t('suppliers.details')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoItem icon={Truck} label={t('suppliers.supplierName')} value={supplier.name} />
              <InfoItem icon={Truck} label={t('suppliers.supplierNameAr')} value={supplier.nameAr} />
              <InfoItem icon={User} label={t('suppliers.contactPerson')} value={supplier.contactPerson} />
              <InfoItem icon={Phone} label={t('common.phone')} value={supplier.phone} />
              <InfoItem icon={Mail} label={t('common.email')} value={supplier.email} />
              <InfoItem icon={MapPin} label={t('suppliers.address')} value={supplier.address} />
            </div>

            {supplier.notes && (
              <div className="mt-6">
                <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  {t('common.notes')}
                </h3>
                <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{supplier.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Products */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <Package className="size-4 text-primary" />
              {t('suppliers.linkedProducts')} ({supplier.products.length})
            </h3>

            {supplier.products.length === 0 ? (
              <div className="text-center py-12">
                <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Package className="size-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">{t('common.noData')}</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {supplier.products.map((sp) => (
                    <div key={sp.id} className="border border-border/60 rounded-xl p-4">
                      <p className="text-sm font-bold mb-1">{sp.product.name}</p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {sp.product.sku && (
                          <div>
                            <span className="font-medium">SKU:</span> {sp.product.sku}
                          </div>
                        )}
                        {sp.supplierSku && (
                          <div>
                            <span className="font-medium">Supplier SKU:</span> {sp.supplierSku}
                          </div>
                        )}
                        {sp.unitCost != null && (
                          <div>
                            <span className="font-medium">Unit Cost:</span> {fmtAmount(sp.unitCost, locale)}
                          </div>
                        )}
                        {sp.leadTimeDays != null && (
                          <div>
                            <span className="font-medium">Lead Time:</span> {sp.leadTimeDays} days
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          Supplier SKU
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          Unit Cost
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          Lead Time (days)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {supplier.products.map((sp) => (
                        <tr key={sp.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-7 py-4 text-start text-sm font-bold">
                            {sp.product.name}
                          </td>
                          <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                            {sp.product.sku || <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                            {sp.supplierSku || <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                            {sp.unitCost != null ? fmtAmount(sp.unitCost, locale) : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                            {sp.leadTimeDays != null ? sp.leadTimeDays : <span className="text-muted-foreground">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
