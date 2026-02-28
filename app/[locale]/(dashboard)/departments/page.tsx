'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Users,
  CheckSquare,
  UserCog,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  parent: { id: string; name: string; nameAr: string | null } | null;
  manager: { id: string; fullName: string } | null;
  _count: { users: number; tasks: number };
}

export default function DepartmentsPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/departments');

      if (!response.ok) {
        if (response.status === 403) {
          toast.error(t('messages.unauthorized'));
          return;
        }
        throw new Error('Failed to fetch departments');
      }

      const data = await response.json();
      setDepartments(data.data);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('departments.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || t('common.error'));
        return;
      }

      toast.success(t('messages.deleteSuccess', { entity: t('departments.title') }));
      fetchDepartments();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const filteredDepartments = departments.filter((dept) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      dept.name.toLowerCase().includes(q) ||
      (dept.nameAr && dept.nameAr.includes(q)) ||
      (dept.manager?.fullName.toLowerCase().includes(q))
    );
  });

  const getDeptName = (dept: { name: string; nameAr: string | null }) => {
    return locale === 'ar' && dept.nameAr ? dept.nameAr : dept.name;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('departments.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {departments.length} {t('departments.title')}
          </p>
        </div>
        <Link href={`/${locale}/departments/new`}>
          <Button className="btn-premium">
            <Plus className="size-4 me-2" />
            {t('departments.create')}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="shadow-premium mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="size-4 text-primary" />
            {t('common.search')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="shadow-premium">
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : filteredDepartments.length === 0 ? (
        <Card className="shadow-premium">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <AlertCircle className="size-12 mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium">{t('common.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Building2 className="size-3" />
                      {t('departments.name')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('departments.parent')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <UserCog className="size-3" />
                      {t('departments.manager')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Users className="size-3" />
                      {t('departments.members')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <CheckSquare className="size-3" />
                      {t('tasks.title')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{getDeptName(dept)}</p>
                        {locale === 'ar' && dept.name && (
                          <p className="text-xs text-muted-foreground mt-0.5">{dept.name}</p>
                        )}
                        {locale !== 'ar' && dept.nameAr && (
                          <p className="text-xs text-muted-foreground mt-0.5">{dept.nameAr}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {dept.parent ? (
                        getDeptName(dept.parent)
                      ) : (
                        <span className="text-muted-foreground">{t('departments.noParent')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {dept.manager ? (
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {dept.manager.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-foreground">{dept.manager.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
                        {dept._count.users}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary">
                        {dept._count.tasks}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/${locale}/departments/${dept.id}/edit`}>
                          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary">
                            <Pencil className="size-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(dept.id)}
                          className="size-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
