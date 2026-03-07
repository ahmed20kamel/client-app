'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ShoppingCart,
  Truck,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertCircle,
  Calendar,
  FileText,
  Send,
  CheckCircle,
  Package,
  Loader2,
} from 'lucide-react';
import { DetailSkeleton } from '@/components/ui/page-skeleton';
import { StatusBadge } from '@/components/StatusBadge';

interface POItem {
  id: string;
  description: string;
  quantity: number;
  receivedQty: number;
  unitPrice: number;
  total: number;
  product: {
    id: string;
    name: string;
  } | null;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  subject: string | null;
  notes: string | null;
  terms: string | null;
  expectedDate: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  supplier: {
    id: string;
    name: string;
  };
  items: POItem[];
}

export default function PurchaseOrderDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Array<{ itemId: string; receivedQty: number }>>([]);

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: t('purchaseOrders.statusDraft'),
      SENT: t('purchaseOrders.statusSent'),
      CONFIRMED: t('purchaseOrders.statusConfirmed'),
      PARTIALLY_RECEIVED: t('purchaseOrders.statusPartiallyReceived'),
      RECEIVED: t('purchaseOrders.statusReceived'),
      CANCELLED: t('purchaseOrders.statusCancelled'),
    };
    return map[s] || s;
  };

  const fetchPO = async () => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('messages.notFound', { entity: t('purchaseOrders.title') }));
          router.push(`/${locale}/purchase-orders`);
          return;
        }
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          router.push(`/${locale}/purchase-orders`);
          return;
        }
        throw new Error('Failed to fetch purchase order');
      }

      const { data } = await response.json();
      setPo(data);
    } catch {
      toast.error(t('common.error'));
      router.push(`/${locale}/purchase-orders`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPO();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('purchaseOrders.title') }));
      router.push(`/${locale}/purchase-orders`);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleStatusAction = async (action: string) => {
    try {
      setActionLoading(true);
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.updateSuccess', { entity: t('purchaseOrders.title') }));
      fetchPO();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const openReceiveDialog = () => {
    if (!po) return;
    setReceiveItems(
      po.items.map((item) => ({
        itemId: item.id,
        receivedQty: 0,
      }))
    );
    setReceiveDialogOpen(true);
  };

  const handleReceiveItems = async () => {
    const itemsToReceive = receiveItems.filter((item) => item.receivedQty > 0);
    if (itemsToReceive.length === 0) {
      toast.error(t('purchaseOrders.enterReceiveQty'));
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`/api/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToReceive }),
      });

      if (!response.ok) throw new Error('Failed');
      toast.success(t('purchaseOrders.itemsReceived'));
      setReceiveDialogOpen(false);
      fetchPO();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const formatAmount = (val: number) => {
    return val.toLocaleString(locale === 'ar' ? 'ar-AE' : 'en-AE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE');
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

  if (!po) {
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

  const InfoItem = ({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string | number | null | undefined }) => {
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
          <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/purchase-orders`)}>
            <ArrowLeft className="size-4 rtl:-scale-x-100" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{po.poNumber}</h1>
              <StatusBadge
                status={po.status}
                label={getStatusLabel(po.status)}
              />
            </div>
            <p className="text-muted-foreground mt-0.5">{po.supplier.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status-based actions */}
          {po.status === 'DRAFT' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusAction('SENT')} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="size-4 me-1 animate-spin" /> : <Send className="size-4 me-1" />}
                {t('purchaseOrders.send')}
              </Button>
              <Link href={`/${locale}/purchase-orders/${id}/edit`}>
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
            </>
          )}
          {po.status === 'SENT' && (
            <Button variant="outline" size="sm" onClick={() => handleStatusAction('CONFIRMED')} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="size-4 me-1 animate-spin" /> : <CheckCircle className="size-4 me-1" />}
              {t('purchaseOrders.markConfirmed')}
            </Button>
          )}
          {(po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED') && (
            <Button variant="outline" size="sm" onClick={openReceiveDialog} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="size-4 me-1 animate-spin" /> : <Package className="size-4 me-1" />}
              {t('purchaseOrders.receiveItems')}
            </Button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* PO Info */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <ShoppingCart className="size-4 text-primary" />
              {t('purchaseOrders.details')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoItem icon={ShoppingCart} label={t('purchaseOrders.poNumber')} value={po.poNumber} />
              <InfoItem icon={Truck} label={t('purchaseOrders.supplier')} value={po.supplier.name} />
              <InfoItem icon={Calendar} label={t('purchaseOrders.expectedDate')} value={formatDate(po.expectedDate)} />
              <InfoItem icon={Calendar} label={t('common.createdAt')} value={formatDate(po.createdAt)} />
              {po.subject && <InfoItem icon={FileText} label={t('purchaseOrders.subject')} value={po.subject} />}
            </div>

            {po.notes && (
              <div className="mt-6">
                <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  {t('common.notes')}
                </h3>
                <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{po.notes}</p>
                </div>
              </div>
            )}

            {po.terms && (
              <div className="mt-6">
                <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  {t('purchaseOrders.terms')}
                </h3>
                <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{po.terms}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
              <Package className="size-4 text-primary" />
              {t('purchaseOrders.items')} ({po.items.length})
            </h3>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {po.items.map((item) => (
                <div key={item.id} className="border border-border/60 rounded-xl p-4">
                  <p className="text-sm font-bold mb-1">{item.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">{t('purchaseOrders.quantity')}:</span> {item.quantity}
                    </div>
                    <div>
                      <span className="font-medium">{t('purchaseOrders.receivedQty')}:</span> {item.receivedQty}
                    </div>
                    <div>
                      <span className="font-medium">{t('purchaseOrders.unitPrice')}:</span> {formatAmount(item.unitPrice)}
                    </div>
                    <div>
                      <span className="font-medium">{t('purchaseOrders.lineTotal')}:</span> {formatAmount(item.total)}
                    </div>
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
                      {t('purchaseOrders.description')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('purchaseOrders.quantity')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('purchaseOrders.receivedQty')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('purchaseOrders.unitPrice')}
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      {t('purchaseOrders.lineTotal')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {po.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-7 py-4 text-start">
                        <p className="text-sm font-bold">{item.description}</p>
                        {item.product && (
                          <p className="text-xs text-muted-foreground">{item.product.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-center text-sm">
                        <span className={item.receivedQty >= item.quantity ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}>
                          {item.receivedQty}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                        {formatAmount(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-center text-sm font-semibold">
                        {formatAmount(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="shadow-premium">
          <CardContent className="pt-6">
            <div className="max-w-sm ms-auto space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('purchaseOrders.subtotal')}</span>
                <span className="font-bold">{formatAmount(po.subtotal)}</span>
              </div>
              {po.discountPercent > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>{t('purchaseOrders.discount')} ({po.discountPercent}%)</span>
                  <span>-{formatAmount(po.discountAmount)}</span>
                </div>
              )}
              {po.taxPercent > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('purchaseOrders.tax')} ({po.taxPercent}%)</span>
                  <span>{formatAmount(po.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-extrabold text-base">{t('purchaseOrders.grandTotal')}</span>
                <span className="font-extrabold text-base text-primary">{formatAmount(po.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receive Items Dialog */}
      <AlertDialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="size-5 text-primary" />
              {t('purchaseOrders.receiveItems')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('purchaseOrders.receiveItemsDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
            {po.items.map((item, index) => {
              const remaining = item.quantity - item.receivedQty;
              return (
                <div key={item.id} className="border border-border/60 rounded-xl p-3">
                  <p className="text-sm font-bold mb-1">{item.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                    <div>{t('purchaseOrders.ordered')}: {item.quantity}</div>
                    <div>{t('purchaseOrders.received')}: {item.receivedQty}</div>
                    <div>{t('purchaseOrders.remaining')}: {remaining}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">{t('purchaseOrders.qtyToReceive')}</label>
                    <Input
                      type="number"
                      min="0"
                      max={remaining}
                      step="1"
                      value={receiveItems[index]?.receivedQty || 0}
                      onChange={(e) => {
                        const updated = [...receiveItems];
                        updated[index] = {
                          ...updated[index],
                          receivedQty: Math.min(parseFloat(e.target.value) || 0, remaining),
                        };
                        setReceiveItems(updated);
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReceiveItems} disabled={actionLoading}>
              {actionLoading && <Loader2 className="size-4 me-1 animate-spin" />}
              {t('purchaseOrders.confirmReceive')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
