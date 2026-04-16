'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_META: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

interface UseListPageOptions {
  /** Base API URL, e.g. '/api/invoices' */
  endpoint: string;
  /** Extra fixed query params (never reset) */
  extraParams?: Record<string, string>;
  /** The query param name for the status/type filter (default: 'status') */
  filterKey?: string;
  /** Toast message on successful delete */
  deleteSuccessMsg?: string;
  /** Toast message on delete error */
  deleteErrorMsg?: string;
  /** Generic error message for fetch */
  fetchErrorMsg?: string;
}

interface UseListPageReturn<T> {
  data: T[];
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  /** Dynamic extra filters (e.g. { customerType: 'B2B', emirate: 'Dubai' }) */
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  page: number;
  setPage: (v: number) => void;
  meta: PaginationMeta;
  deleteTarget: string | null;
  setDeleteTarget: (id: string | null) => void;
  handleDelete: (id: string) => Promise<void>;
  refresh: () => void;
}

export function useListPage<T>(options: UseListPageOptions): UseListPageReturn<T> {
  const {
    endpoint,
    extraParams = {},
    filterKey = 'status',
    deleteSuccessMsg = 'Deleted successfully',
    deleteErrorMsg = 'Delete failed',
    fetchErrorMsg = 'Failed to load data',
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearchState] = useState('');
  const [status, setStatusState] = useState('');
  const [filters, setFiltersState] = useState<Record<string, string>>({});
  const [page, setPageState] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>(DEFAULT_META);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const setSearch = useCallback((v: string) => {
    setSearchState(v);
    setPageState(1);
  }, []);

  const setStatus = useCallback((v: string) => {
    setStatusState(v);
    setPageState(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPageState(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchState('');
    setStatusState('');
    setFiltersState({});
    setPageState(1);
  }, []);

  const setPage = useCallback((v: number) => setPageState(v), []);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), ...extraParams });
        if (search) params.set('search', search);
        if (status) params.set(filterKey, status);
        // Append all dynamic filters
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

        const res = await fetch(`${endpoint}?${params.toString()}`);

        if (!res.ok) {
          if (!cancelled) toast.error(fetchErrorMsg);
          return;
        }

        const json = await res.json();
        if (!cancelled) {
          setData(json.data ?? []);
          if (json.meta) setMeta(json.meta);
        }
      } catch {
        if (!cancelled) toast.error(fetchErrorMsg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, search, status, filters, refreshKey]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`${endpoint}/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'delete failed');
        }
        toast.success(deleteSuccessMsg);
        setDeleteTarget(null);
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : deleteErrorMsg);
      }
    },
    [endpoint, deleteSuccessMsg, deleteErrorMsg, refresh]
  );

  return {
    data,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    filters,
    setFilter,
    clearFilters,
    page,
    setPage,
    meta,
    deleteTarget,
    setDeleteTarget,
    handleDelete,
    refresh,
  };
}
