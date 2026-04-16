'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Search, Filter, Eye, AlertTriangle } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useListPage } from '@/hooks/useListPage';
import { fmtAmount } from '@/lib/utils';

interface InventoryCategory { id: string; name: string }

interface Product {
  id: string;
  name: string;
  nameAr: string | null;
  sku: string;
  category: InventoryCategory | null;
  unitOfMeasure: string;
  currentStock: number;
  minStockLevel: number;
  costPrice: number | null;
  sellingPrice: number | null;
  status: string;
  image: string | null;
}


export default function InventoryPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  const [categories, setCategories] = useState<InventoryCategory[]>([]);

  const { data: products, loading, search, setSearch, setFilter, clearFilters, filters, page, setPage, meta } =
    useListPage<Product>({
      endpoint: '/api/inventory',
      fetchErrorMsg: t('common.error'),
    });

  useEffect(() => {
    fetch('/api/inventory-categories?limit=1000').then(r => r.json()).then(d => setCategories(d.data || [])).catch(() => {});
  }, []);

  const hasActiveFilters = !!(filters.categoryId || filters.status);

  const fmt = (n: number) => fmtAmount(n, locale);
  const getStockStatus = (p: Product) => p.currentStock <= 0 ? 'out' : p.currentStock <= p.minStockLevel ? 'low' : 'ok';
  const getStockColor = (s: string) => s === 'out' ? 'text-red-600 bg-red-50' : s === 'low' ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';
  const getStatusLabel = (s: string) => ({ ACTIVE: t('inventory.statusActive'), INACTIVE: t('inventory.statusInactive'), DISCONTINUED: t('inventory.statusDiscontinued') }[s] ?? s);

  const ProductImage = ({ product }: { product: Product }) => product.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
      <Package className="size-5 text-muted-foreground/40" />
    </div>
  );

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <PageHeader
          title={t('inventory.title')}
          subtitle={`${meta.total} ${t('inventory.title')}`}
          icon={Package}
          actions={
            <Link href={`/${locale}/inventory/new`}>
              <Button className="btn-premium" size="sm">
                <Plus className="size-4 me-1 sm:me-2" />
                <span className="hidden sm:inline">{t('inventory.createProduct')}</span>
                <span className="sm:hidden">{t('common.new')}</span>
              </Button>
            </Link>
          }
        />

        <div className="p-5 space-y-5">
          <Card className="shadow-premium">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="size-4 text-primary" />
                {t('common.search')} &amp; {t('common.filter')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative lg:col-span-2">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-10" />
                </div>
                <Select value={filters.categoryId || 'ALL'} onValueChange={(v) => setFilter('categoryId', v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('inventory.allCategories')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('inventory.allCategories')}</SelectItem>
                    {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.status || 'ALL'} onValueChange={(v) => setFilter('status', v === 'ALL' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder={t('inventory.allStatuses')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('inventory.allStatuses')}</SelectItem>
                    <SelectItem value="ACTIVE">{t('inventory.statusActive')}</SelectItem>
                    <SelectItem value="INACTIVE">{t('inventory.statusInactive')}</SelectItem>
                    <SelectItem value="DISCONTINUED">{t('inventory.statusDiscontinued')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end mt-3 pt-3 border-t">
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">{t('common.clear')}</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : products.length === 0 ? (
            <Card className="shadow-premium">
              <CardContent className="p-0">
                <EmptyState title={t('inventory.noProducts')} />
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
                          <ProductImage product={product} />
                          <div className="flex-1 min-w-0">
                            <Link href={`/${locale}/inventory/${product.id}`} className="text-sm font-bold hover:text-primary">{product.name}</Link>
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                          </div>
                          <StatusBadge status={product.status} label={getStatusLabel(product.status)} size="sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                          {product.category && <div>{product.category.name}</div>}
                          <div className={`font-semibold flex items-center gap-1 ${stockStatus === 'out' ? 'text-red-600' : stockStatus === 'low' ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {stockStatus === 'low' && <AlertTriangle className="size-3" />}
                            {product.currentStock} {t('inventory.currentStock')}
                          </div>
                        </div>
                        <div className="flex justify-end border-t pt-2">
                          <Link href={`/${locale}/inventory/${product.id}`}><Button variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-primary"><Eye className="size-4" /></Button></Link>
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
                        {[t('inventory.productName'), t('inventory.category'), t('inventory.currentStock'), t('inventory.costPrice'), t('inventory.sellingPrice'), t('common.status'), t('common.actions')].map((h, i) => (
                          <th key={i} className={`px-4 py-3 text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider ${i === 0 ? 'text-start first:px-7' : i <= 1 ? 'text-start' : 'text-center'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map((product) => {
                        const stockStatus = getStockStatus(product);
                        return (
                          <tr key={product.id} className="hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => router.push(`/${locale}/inventory/${product.id}`)}>
                            <td className="px-7 py-4">
                              <div className="flex items-center gap-3">
                                <ProductImage product={product} />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold truncate">{product.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-muted-foreground">{product.category?.name || '-'}</td>
                            <td className="px-4 py-4 text-center">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStockColor(stockStatus)}`}>
                                {stockStatus === 'low' && <AlertTriangle className="size-3" />}
                                {product.currentStock}
                                {stockStatus === 'out' && <span className="text-[10px]">({t('inventory.outOfStock')})</span>}
                                {stockStatus === 'low' && <span className="text-[10px]">({t('inventory.lowStock')})</span>}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center text-sm text-muted-foreground tabular-nums">{product.costPrice != null ? fmt(product.costPrice) : <span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-4 py-4 text-center text-sm font-semibold tabular-nums">{product.sellingPrice != null ? fmt(product.sellingPrice) : <span className="text-muted-foreground/40">—</span>}</td>
                            <td className="px-4 py-4 text-center"><StatusBadge status={product.status} label={getStatusLabel(product.status)} /></td>
                            <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <Link href={`/${locale}/inventory/${product.id}`}><Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"><Eye className="size-3.5" /></Button></Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
