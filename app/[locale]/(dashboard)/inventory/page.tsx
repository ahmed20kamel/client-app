'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

interface InventoryCategory {
  id: string;
  name: string;
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
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  costPrice: number;
  sellingPrice: number;
  status: string;
  imageUrl: string | null;
  location: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  ACTIVE: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  INACTIVE: { color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
  DISCONTINUED: { color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

export default function InventoryPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetch('/api/inventory-categories?limit=1000')
      .then((res) => res.json())
      .then((data) => setCategories(data.data || []))
      .catch(() => {});
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('page', page.toString());
      if (search) queryParams.set('search', search);
      if (categoryFilter) queryParams.set('categoryId', categoryFilter);
      if (statusFilter) queryParams.set('status', statusFilter);

      const response = await fetch(`/api/inventory?${queryParams.toString()}`);

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter, statusFilter]);

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const hasActiveFilters = categoryFilter || statusFilter;

  const getStockStatus = (product: Product) => {
    if (product.currentStock <= 0) return 'out';
    if (product.currentStock <= product.minStockLevel) return 'low';
    return 'ok';
  };

  const getStockColor = (stockStatus: string) => {
    if (stockStatus === 'out') return 'text-red-600 bg-red-50';
    if (stockStatus === 'low') return 'text-amber-600 bg-amber-50';
    return 'text-emerald-600 bg-emerald-50';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return t('inventory.statusActive');
      case 'INACTIVE': return t('inventory.statusInactive');
      case 'DISCONTINUED': return t('inventory.statusDiscontinued');
      default: return status;
    }
  };

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Header */}
        <PageHeader
          title={t('inventory.title')}
          subtitle={`${meta.total} ${t('inventory.title')}`}
          icon={Package}
          actions={
            <Link href={`/${locale}/inventory/new`}>
              <Button className="btn-premium" size="sm">
                <Plus className="size-4 me-1 sm:me-2" />
                <span className="hidden sm:inline">{t('inventory.createProduct')}</span>
                <span className="sm:hidden"><Plus className="size-4" /></span>
              </Button>
            </Link>
          }
        />

        <div className="p-5 space-y-5">
          {/* Filters */}
          <Card className="shadow-premium mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="size-4 text-primary" />
                {t('common.search')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder={t('common.search')}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="ps-10"
                  />
                </div>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val === 'ALL' ? '' : val); setPage(1); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('inventory.allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('inventory.allCategories')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val === 'ALL' ? '' : val); setPage(1); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('inventory.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('inventory.allStatuses')}</SelectItem>
                    <SelectItem value="ACTIVE">{t('inventory.statusActive')}</SelectItem>
                    <SelectItem value="INACTIVE">{t('inventory.statusInactive')}</SelectItem>
                    <SelectItem value="DISCONTINUED">{t('inventory.statusDiscontinued')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-end mt-4 pt-4 border-t">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <RotateCcw className="size-3 me-1" />
                    {t('common.clear')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Table */}
          {loading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : products.length === 0 ? (
            <Card className="shadow-premium">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
                <p className="text-lg font-medium">{t('inventory.noProducts')}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {products.map((product) => {
                  const stockStatus = getStockStatus(product);
                  return (
                    <Card key={product.id} className="shadow-premium">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                              <Package className="size-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Link href={`/${locale}/inventory/${product.id}`} className="text-sm font-bold hover:text-primary transition-colors">
                              {product.name}
                            </Link>
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                          </div>
                          <StatusBadge
                            status={product.status}
                            label={getStatusLabel(product.status)}
                            config={STATUS_CONFIG}
                            size="sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                          {product.category && (
                            <div>{product.category.name}</div>
                          )}
                          <div className={`font-semibold inline-flex items-center gap-1 ${stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {stockStatus === 'low' && <AlertTriangle className="size-3" />}
                            {product.currentStock} {t('inventory.currentStock')}
                          </div>
                          <div>{t('inventory.costPrice')}: {product.costPrice.toLocaleString()}</div>
                          <div>{t('inventory.sellingPrice')}: {product.sellingPrice.toLocaleString()}</div>
                        </div>
                        <div className="flex items-center justify-end gap-1 border-t pt-2">
                          <Link href={`/${locale}/inventory/${product.id}`}>
                            <Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary">
                              <Eye className="size-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <Card className="shadow-premium overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-7 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {t('inventory.productName')}
                        </th>
                        <th className="px-4 py-3 text-start text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {t('inventory.category')}
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {t('inventory.currentStock')}
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {t('inventory.costPrice')}
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {t('inventory.sellingPrice')}
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {t('common.status')}
                        </th>
                        <th className="px-4 py-3 text-center text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                          {t('common.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map((product) => {
                        const stockStatus = getStockStatus(product);
                        return (
                          <tr
                            key={product.id}
                            className="hover:bg-muted/20 transition-colors cursor-pointer"
                            onClick={() => router.push(`/${locale}/inventory/${product.id}`)}
                          >
                            <td className="px-7 py-4 text-start">
                              <div className="flex items-center gap-3">
                                {product.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                                    <Package className="size-5 text-muted-foreground/40" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-bold truncate">{product.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-start text-sm text-muted-foreground">
                              {product.category?.name || '-'}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStockColor(stockStatus)}`}>
                                {stockStatus === 'low' && <AlertTriangle className="size-3" />}
                                {product.currentStock}
                                {stockStatus === 'out' && (
                                  <span className="text-[10px]">({t('inventory.outOfStock')})</span>
                                )}
                                {stockStatus === 'low' && (
                                  <span className="text-[10px]">({t('inventory.lowStock')})</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                              {product.costPrice.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-center text-sm font-semibold">
                              {product.sellingPrice.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <StatusBadge
                                status={product.status}
                                label={getStatusLabel(product.status)}
                                config={STATUS_CONFIG}
                              />
                            </td>
                            <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <Link href={`/${locale}/inventory/${product.id}`}>
                                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                                  <Eye className="size-3.5" />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('common.showing')} {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} {t('common.of')} {meta.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="size-4 me-1 rtl:-scale-x-100" />
                      {t('common.previous')}
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-sm font-medium">{meta.page}</span>
                      <span className="text-sm text-muted-foreground">/</span>
                      <span className="text-sm text-muted-foreground">{meta.totalPages}</span>
                    </div>
                    <Button
                      onClick={() => setPage(page + 1)}
                      disabled={page === meta.totalPages}
                      variant="outline"
                      size="sm"
                    >
                      {t('common.next')}
                      <ChevronRight className="size-4 ms-1 rtl:-scale-x-100" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
