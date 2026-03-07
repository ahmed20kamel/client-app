'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Package,
  ArrowLeft,
  Save,
  Loader2,
  Info,
  DollarSign,
  FileText,
  Upload,
  Download,
  Image,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { TableSkeleton } from '@/components/ui/table-skeleton';

interface InventoryCategory {
  id: string;
  name: string;
}

const UNIT_OPTIONS = ['PIECE', 'KG', 'METER', 'LITER', 'BOX', 'CARTON', 'PALLET'] as const;
const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'DISCONTINUED'] as const;

export default function EditProductPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'stock' | 'files'>('basic');

  // Form state
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('PIECE');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [minStockLevel, setMinStockLevel] = useState('0');
  const [maxStockLevel, setMaxStockLevel] = useState('0');
  const [costPrice, setCostPrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');

  // File state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [datasheetUrl, setDatasheetUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDatasheet, setUploadingDatasheet] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const datasheetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/inventory-categories?limit=1000')
      .then((res) => res.json())
      .then((data) => setCategories(data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
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
        setName(data.name || '');
        setNameAr(data.nameAr || '');
        setSku(data.sku || '');
        setBarcode(data.barcode || '');
        setCategoryId(data.categoryId || '');
        setUnitOfMeasure(data.unitOfMeasure || 'PIECE');
        setDescription(data.description || '');
        setDescriptionAr(data.descriptionAr || '');
        setStatus(data.status || 'ACTIVE');
        setLocation(data.location || '');
        setNotes(data.notes || '');
        setCurrentStock(String(data.currentStock ?? 0));
        setMinStockLevel(String(data.minStockLevel ?? 0));
        setMaxStockLevel(String(data.maxStockLevel ?? 0));
        setCostPrice(String(data.costPrice ?? 0));
        setSellingPrice(String(data.sellingPrice ?? 0));
        setImageUrl(data.imageUrl || null);
        setDatasheetUrl(data.datasheetUrl || null);
      } catch {
        toast.error(t('common.error'));
        router.push(`/${locale}/inventory`);
      } finally {
        setIsFetching(false);
      }
    };

    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'ACTIVE': return t('inventory.statusActive');
      case 'INACTIVE': return t('inventory.statusInactive');
      case 'DISCONTINUED': return t('inventory.statusDiscontinued');
      default: return s;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('common.error'));
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        categoryId: categoryId || undefined,
        unitOfMeasure,
        description: description.trim() || undefined,
        descriptionAr: descriptionAr.trim() || undefined,
        status,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        currentStock: parseFloat(currentStock) || 0,
        minStockLevel: parseFloat(minStockLevel) || 0,
        maxStockLevel: parseFloat(maxStockLevel) || 0,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
      };

      const response = await fetch(`/api/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('messages.notFound'));
          router.push(`/${locale}/inventory`);
          return;
        }
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || t('common.error'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('inventory.title') }));
      router.push(`/${locale}/inventory/${id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
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
      const { data } = await response.json();
      setImageUrl(data.imageUrl || null);
      toast.success(t('messages.updateSuccess', { entity: t('inventory.image') }));
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
      const { data } = await response.json();
      setDatasheetUrl(data.datasheetUrl || null);
      toast.success(t('messages.updateSuccess', { entity: t('inventory.datasheet') }));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploadingDatasheet(false);
    }
  };

  const tabs = [
    { key: 'basic' as const, label: t('inventory.basicInfo'), icon: Info },
    { key: 'stock' as const, label: t('inventory.stockAndPricing'), icon: DollarSign },
    { key: 'files' as const, label: t('inventory.files'), icon: FileText },
  ];

  if (isFetching) {
    return (
      <div className="p-3 md:p-3.5">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <TableSkeleton rows={8} columns={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('inventory.editProduct')}
          icon={Package}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/inventory/${id}`)}>
              <ArrowLeft className="size-4 me-1 rtl:-scale-x-100" />
              {t('common.back')}
            </Button>
          }
        />

        <div className="p-5">
          <form onSubmit={handleSubmit}>
            {/* Tab Navigation */}
            <div className="flex border-b border-border mb-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <Card className="shadow-premium">
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.productName')} *</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.productNameAr')}</label>
                      <Input
                        value={nameAr}
                        onChange={(e) => setNameAr(e.target.value)}
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.sku')}</label>
                      <Input
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.barcode')}</label>
                      <Input
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.category')}</label>
                      <Select value={categoryId} onValueChange={(val) => setCategoryId(val === 'NONE' ? '' : val)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('inventory.category')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">-</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.unitOfMeasure')}</label>
                      <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((unit) => (
                            <SelectItem key={unit} value={unit}>{getUnitLabel(unit)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('common.status')}</label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.location')}</label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('common.description')}</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('common.description')} ({t('inventory.productNameAr')})</label>
                    <textarea
                      value={descriptionAr}
                      onChange={(e) => setDescriptionAr(e.target.value)}
                      rows={3}
                      dir="rtl"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('common.notes')}</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock & Pricing Tab */}
            {activeTab === 'stock' && (
              <Card className="shadow-premium">
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.currentStock')}</label>
                      <Input
                        type="number"
                        step="any"
                        value={currentStock}
                        onChange={(e) => setCurrentStock(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.minStockLevel')}</label>
                      <Input
                        type="number"
                        step="any"
                        value={minStockLevel}
                        onChange={(e) => setMinStockLevel(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.maxStockLevel')}</label>
                      <Input
                        type="number"
                        step="any"
                        value={maxStockLevel}
                        onChange={(e) => setMaxStockLevel(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.costPrice')}</label>
                      <Input
                        type="number"
                        step="any"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{t('inventory.sellingPrice')}</label>
                      <Input
                        type="number"
                        step="any"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
              <Card className="shadow-premium">
                <CardContent className="p-6 space-y-8">
                  {/* Product Image */}
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      <Image className="size-4 text-primary" />
                      {t('inventory.image')}
                    </h3>
                    {imageUrl && (
                      <div className="mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={name}
                          className="max-w-[200px] h-auto rounded-xl object-cover"
                        />
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
                    <div
                      onClick={() => !uploadingImage && imageInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all border-border hover:border-primary/50 hover:bg-secondary/30"
                    >
                      {uploadingImage ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="size-5 text-primary animate-spin" />
                          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="size-6 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">{t('inventory.uploadImage')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datasheet */}
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground mb-3 flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      {t('inventory.datasheet')}
                    </h3>
                    {datasheetUrl && (
                      <div className="mb-3">
                        <a
                          href={datasheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Download className="size-4" />
                          {t('inventory.downloadDatasheet')}
                        </a>
                      </div>
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
                    <div
                      onClick={() => !uploadingDatasheet && datasheetInputRef.current?.click()}
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all border-border hover:border-primary/50 hover:bg-secondary/30"
                    >
                      {uploadingDatasheet ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="size-5 text-primary animate-spin" />
                          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="size-6 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">{t('inventory.uploadDatasheet')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/inventory/${id}`)}>
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
        </div>
      </div>
    </div>
  );
}
