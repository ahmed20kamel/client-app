'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
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
import {
  Package,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  CornerDownLeft,
  ArrowRightLeft,
  Plus,
  Calendar,
  User,
  Download,
  Upload,
  Loader2,
  DollarSign,
  TrendingUp,
  MapPin,
  Barcode,
  Layers,
  FileText,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { TableSkeleton } from '@/components/ui/table-skeleton';

interface InventoryCategory {
  id: string;
  name: string;
}

interface StockMovement {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
  };
}

interface LinkedSupplier {
  id: string;
  supplier: {
    id: string;
    name: string;
  };
  supplierSku: string | null;
  unitCost: number | null;
  leadTimeDays: number | null;
}

interface Product {
  id: string;
  name: string;
  nameAr: string | null;
  sku: string;
  barcode: string | null;
  category: InventoryCategory | null;
  categoryId: string | null;
  unitOfMeasure: string;
  description: string | null;
  descriptionAr: string | null;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  costPrice: number;
  sellingPrice: number;
  status: string;
  imageUrl: string | null;
  datasheetUrl: string | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  stockMovements: StockMovement[];
  supplierLinks: LinkedSupplier[];
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  INACTIVE: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  DISCONTINUED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

const MOVEMENT_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: typeof ArrowDownCircle }> = {
  IN: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: ArrowDownCircle },
  OUT: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: ArrowUpCircle },
  ADJUSTMENT: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: RefreshCw },
  RETURN: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: CornerDownLeft },
  TRANSFER: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: ArrowRightLeft },
};

export default function ProductDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementType, setMovementType] = useState('IN');
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [movementReference, setMovementReference] = useState('');
  const [submittingMovement, setSubmittingMovement] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDatasheet, setUploadingDatasheet] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const datasheetInputRef = useRef<HTMLInputElement>(null);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/inventory/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('messages.notFound'));
          router.push(`/${locale}/inventory`);
          return;
        }
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          router.push(`/${locale}/inventory`);
          return;
        }
        throw new Error('Failed to fetch product');
      }

      const { data } = await response.json();
      setProduct(data);
    } catch {
      toast.error(t('common.error'));
      router.push(`/${locale}/inventory`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed');
      toast.success(t('messages.deleteSuccess', { entity: t('inventory.title') }));
      router.push(`/${locale}/inventory`);
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementQty || parseFloat(movementQty) <= 0) return;

    setSubmittingMovement(true);
    try {
      const response = await fetch(`/api/inventory/${id}/stock-movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: movementType,
          quantity: parseFloat(movementQty),
          reason: movementReason.trim() || undefined,
          reference: movementReference.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || t('common.error'));
        return;
      }

      toast.success(t('messages.createSuccess', { entity: t('inventory.stockMovements') }));
      setShowMovementForm(false);
      setMovementType('IN');
      setMovementQty('');
      setMovementReason('');
      setMovementReference('');
      fetchProduct();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmittingMovement(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/inventory/${id}/upload-image`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || t('common.error'));
        return;
      }
      toast.success(t('messages.updateSuccess', { entity: t('inventory.image') }));
      fetchProduct();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUploadDatasheet = async (file: File) => {
    setUploadingDatasheet(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/inventory/${id}/upload-datasheet`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || t('common.error'));
        return;
      }
      toast.success(t('messages.updateSuccess', { entity: t('inventory.datasheet') }));
      fetchProduct();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploadingDatasheet(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return t('inventory.statusActive');
      case 'INACTIVE': return t('inventory.statusInactive');
      case 'DISCONTINUED': return t('inventory.statusDiscontinued');
      default: return status;
    }
  };

  const getUnitLabel = (unit: string) => {
    switch (unit) {
      case 'PIECE': return t('inventory.unitPiece');
      case 'KG': return t('inventory.unitKg');
      case 'METER': return t('inventory.unitMeter');
      case 'LITER': return t('inventory.unitLiter');
      case 'BOX': return t('inventory.unitBox');
      case 'CARTON': return t('inventory.unitCarton');
      case 'PALLET': return t('inventory.unitPallet');
      default: return unit;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'IN': return t('inventory.movementIn');
      case 'OUT': return t('inventory.movementOut');
      case 'ADJUSTMENT': return t('inventory.movementAdjustment');
      case 'RETURN': return t('inventory.movementReturn');
      case 'TRANSFER': return t('inventory.movementTransfer');
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <TableSkeleton rows={8} columns={4} />
        </div>
      </div>
    );
  }

  if (!product) {
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

  const profit = product.sellingPrice - product.costPrice;
  const margin = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;
  const stockStatus = product.currentStock <= 0 ? 'out' : product.currentStock <= product.minStockLevel ? 'low' : 'ok';

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/inventory`)}>
              <ArrowLeft className="size-4 rtl:-scale-x-100" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{product.name}</h1>
                <StatusBadge
                  status={product.status}
                  label={getStatusLabel(product.status)}
                  config={STATUS_CONFIG}
                />
              </div>
              {product.nameAr && (
                <p className="text-muted-foreground mt-0.5" dir="rtl">{product.nameAr}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/inventory/${id}/edit`}>
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

        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar */}
            <div className="space-y-6">
              {/* Product Image */}
              <Card className="shadow-premium">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full max-w-[240px] h-auto rounded-xl object-cover mb-4"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                      <Package className="size-16 text-muted-foreground/30" />
                    </div>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="mt-2"
                  >
                    {uploadingImage ? (
                      <Loader2 className="size-4 me-1 animate-spin" />
                    ) : (
                      <Upload className="size-4 me-1" />
                    )}
                    {t('inventory.uploadImage')}
                  </Button>
                </CardContent>
              </Card>

              {/* Product Info */}
              <Card className="shadow-premium">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Barcode className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('inventory.sku')}</p>
                      <p className="font-bold font-mono">{product.sku}</p>
                    </div>
                  </div>
                  {product.barcode && (
                    <div className="flex items-center gap-3 text-sm">
                      <Barcode className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground font-medium">{t('inventory.barcode')}</p>
                        <p className="font-bold font-mono">{product.barcode}</p>
                      </div>
                    </div>
                  )}
                  {product.category && (
                    <div className="flex items-center gap-3 text-sm">
                      <Layers className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground font-medium">{t('inventory.category')}</p>
                        <p className="font-bold">{product.category.name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Package className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('inventory.unitOfMeasure')}</p>
                      <p className="font-bold">{getUnitLabel(product.unitOfMeasure)}</p>
                    </div>
                  </div>
                  {product.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-[11px] text-muted-foreground font-medium">{t('inventory.location')}</p>
                        <p className="font-bold">{product.location}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium">{t('common.createdAt')}</p>
                      <p className="font-bold">{new Date(product.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock & Pricing KPIs */}
              <Card className="shadow-premium">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Package className="size-3.5" />
                      {t('inventory.currentStock')}
                    </span>
                    <span className={`text-sm font-bold inline-flex items-center gap-1 ${
                      stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {stockStatus === 'low' && <AlertTriangle className="size-3" />}
                      {product.currentStock}
                    </span>
                  </div>
                  {stockStatus !== 'ok' && (
                    <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
                      stockStatus === 'out' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <AlertTriangle className="size-3 inline me-1" />
                      {stockStatus === 'out' ? t('inventory.outOfStock') : t('inventory.lowStock')}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('inventory.minStockLevel')}</span>
                    <span className="text-sm font-bold">{product.minStockLevel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('inventory.maxStockLevel')}</span>
                    <span className="text-sm font-bold">{product.maxStockLevel}</span>
                  </div>
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="size-3.5" />
                        {t('inventory.costPrice')}
                      </span>
                      <span className="text-sm font-bold">{product.costPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="size-3.5" />
                        {t('inventory.sellingPrice')}
                      </span>
                      <span className="text-sm font-bold">{product.sellingPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="size-3.5" />
                        {t('inventory.profit')}
                      </span>
                      <span className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {profit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('inventory.margin')}</span>
                      <span className={`text-sm font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Datasheet */}
              <Card className="shadow-premium">
                <CardContent className="pt-6">
                  <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    {t('inventory.datasheet')}
                  </h3>
                  {product.datasheetUrl ? (
                    <a
                      href={product.datasheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Download className="size-4" />
                      {t('inventory.downloadDatasheet')}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                  )}
                  <input
                    ref={datasheetInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadDatasheet(file);
                      e.target.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => datasheetInputRef.current?.click()}
                    disabled={uploadingDatasheet}
                    className="mt-3 w-full"
                  >
                    {uploadingDatasheet ? (
                      <Loader2 className="size-4 me-1 animate-spin" />
                    ) : (
                      <Upload className="size-4 me-1" />
                    )}
                    {t('inventory.uploadDatasheet')}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {(product.description || product.descriptionAr) && (
                <Card className="shadow-premium">
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      {t('common.description')}
                    </h3>
                    {product.description && (
                      <div className="rounded-xl bg-muted/30 border border-border/50 p-5 mb-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{product.description}</p>
                      </div>
                    )}
                    {product.descriptionAr && (
                      <div className="rounded-xl bg-muted/30 border border-border/50 p-5" dir="rtl">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{product.descriptionAr}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {product.notes && (
                <Card className="shadow-premium">
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      {t('common.notes')}
                    </h3>
                    <div className="rounded-xl bg-muted/30 border border-border/50 p-5">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{product.notes}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stock Movements */}
              <Card className="shadow-premium">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                      <RefreshCw className="size-4 text-primary" />
                      {t('inventory.stockMovements')}
                    </h3>
                    <Button
                      size="sm"
                      className="btn-premium"
                      onClick={() => setShowMovementForm(!showMovementForm)}
                    >
                      <Plus className="size-4 me-1.5" />
                      {t('inventory.addMovement')}
                    </Button>
                  </div>

                  {/* Add Movement Form (inline) */}
                  {showMovementForm && (
                    <form onSubmit={handleAddMovement} className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">{t('inventory.movementType')}</label>
                          <Select value={movementType} onValueChange={setMovementType}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="IN">{t('inventory.movementIn')}</SelectItem>
                              <SelectItem value="OUT">{t('inventory.movementOut')}</SelectItem>
                              <SelectItem value="ADJUSTMENT">{t('inventory.movementAdjustment')}</SelectItem>
                              <SelectItem value="RETURN">{t('inventory.movementReturn')}</SelectItem>
                              <SelectItem value="TRANSFER">{t('inventory.movementTransfer')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">{t('inventory.quantity')} *</label>
                          <Input
                            type="number"
                            step="any"
                            min="0.01"
                            value={movementQty}
                            onChange={(e) => setMovementQty(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">{t('inventory.reason')}</label>
                          <Input
                            value={movementReason}
                            onChange={(e) => setMovementReason(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">{t('inventory.reference')}</label>
                          <Input
                            value={movementReference}
                            onChange={(e) => setMovementReference(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowMovementForm(false)}>
                          {t('common.cancel')}
                        </Button>
                        <Button type="submit" size="sm" className="btn-premium" disabled={submittingMovement}>
                          {submittingMovement && <Loader2 className="size-4 me-1 animate-spin" />}
                          {t('common.save')}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Movements Table */}
                  {product.stockMovements.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="size-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="size-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">{t('inventory.noMovements')}</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile cards */}
                      <div className="md:hidden space-y-2.5">
                        {product.stockMovements.map((movement) => {
                          const config = MOVEMENT_TYPE_CONFIG[movement.type] || MOVEMENT_TYPE_CONFIG.IN;
                          const MoveIcon = config.icon;
                          return (
                            <div key={movement.id} className="p-3 rounded-xl border border-border/60">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                  <MoveIcon className="size-3" />
                                  {getMovementLabel(movement.type)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(movement.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">{t('inventory.quantity')}:</span>
                                  <span className="font-bold ms-1">{movement.quantity}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{t('inventory.previousStock')}:</span>
                                  <span className="font-bold ms-1">{movement.previousStock}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{t('inventory.newStock')}:</span>
                                  <span className="font-bold ms-1">{movement.newStock}</span>
                                </div>
                              </div>
                              {movement.reason && (
                                <p className="text-xs text-muted-foreground mt-1">{movement.reason}</p>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <User className="size-3" />
                                {movement.user.fullName}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                {t('inventory.movementType')}
                              </th>
                              <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                {t('inventory.quantity')}
                              </th>
                              <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                {t('inventory.previousStock')}
                              </th>
                              <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                {t('inventory.newStock')}
                              </th>
                              <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                {t('inventory.reason')}
                              </th>
                              <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                {t('common.date')}
                              </th>
                              <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                {t('common.user')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {product.stockMovements.map((movement) => {
                              const config = MOVEMENT_TYPE_CONFIG[movement.type] || MOVEMENT_TYPE_CONFIG.IN;
                              const MoveIcon = config.icon;
                              return (
                                <tr key={movement.id} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
                                      <MoveIcon className="size-3" />
                                      {getMovementLabel(movement.type)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm font-bold">
                                    {movement.quantity}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                                    {movement.previousStock}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm font-semibold">
                                    {movement.newStock}
                                  </td>
                                  <td className="px-4 py-3 text-start text-sm text-muted-foreground max-w-[200px] truncate">
                                    {movement.reason || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                                    {new Date(movement.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-AE' : 'en-AE')}
                                  </td>
                                  <td className="px-4 py-3 text-start text-sm text-muted-foreground">
                                    {movement.user.fullName}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Linked Suppliers */}
              <Card className="shadow-premium">
                <CardContent className="pt-6">
                  <h3 className="text-sm font-extrabold text-foreground mb-5 flex items-center gap-2">
                    <User className="size-4 text-primary" />
                    {t('inventory.supplierLinks')}
                  </h3>

                  {product.supplierLinks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {product.supplierLinks.map((link) => (
                        <div key={link.id} className="p-4 rounded-xl border border-border/60 hover:border-primary/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold">{link.supplier.name}</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                            {link.supplierSku && (
                              <div>
                                <span className="font-medium">{t('inventory.supplierSku')}:</span> {link.supplierSku}
                              </div>
                            )}
                            {link.unitCost != null && (
                              <div>
                                <span className="font-medium">{t('inventory.unitCost')}:</span> {link.unitCost.toLocaleString()}
                              </div>
                            )}
                            {link.leadTimeDays != null && (
                              <div>
                                <span className="font-medium">{t('inventory.leadTimeDays')}:</span> {link.leadTimeDays}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
