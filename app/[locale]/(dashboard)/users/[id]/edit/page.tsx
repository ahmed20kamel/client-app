'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/PhoneInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { toast } from 'sonner';
import {
  User, Mail, Lock, Shield, Briefcase, Building2,
  ArrowLeft, Save, Loader2, UserCog, Camera,
  ChevronDown, ChevronUp, CheckCheck, X,
} from 'lucide-react';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { PageHeader } from '@/components/PageHeader';
import { getApiErrorMessage } from '@/lib/api-error';
import { PageSkeleton } from '@/components/ui/page-skeleton';

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  fullNameAr: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional().refine(
    val => !val || /^\+\d{7,15}$/.test(val),
    { message: 'Invalid phone number' }
  ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    )
    .optional()
    .or(z.literal('')),
  roleId: z.string().min(1, 'Role is required'),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

type UpdateUserForm = z.infer<typeof updateUserSchema>;

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface Department {
  id: string;
  name: string;
  nameAr: string | null;
}

interface UserData {
  id: string;
  email: string;
  fullName: string;
  fullNameAr: string | null;
  jobTitle: string | null;
  phone: string | null;
  profileImage: string | null;
  status: 'ACTIVE' | 'DISABLED';
  role: {
    id: string;
    name: string;
  } | null;
  department: {
    id: string;
    name: string;
    nameAr: string | null;
  } | null;
}

export default function EditUserPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const userId = params.id as string;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [loadingRolePreset, setLoadingRolePreset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema),
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/roles').then((res) => res.json()),
      fetch('/api/departments').then((res) => res.json()),
      fetch(`/api/users/${userId}/permissions`).then((res) => res.json()),
      fetch(`/api/users/${userId}`).then((res) => {
        if (res.status === 404) {
          toast.error(t('messages.notFound', { entity: t('users.title') }));
          router.push(`/${locale}/users`);
          throw new Error('not-found');
        }
        if (res.status === 403) {
          toast.error(t('messages.unauthorized'));
          router.push(`/${locale}/users`);
          throw new Error('forbidden');
        }
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
      }),
    ])
      .then(([rolesData, deptsData, permsData, userData]) => {
        setRoles(rolesData.data);
        setDepartments(deptsData.data);
        setSelectedPermissions(permsData.data ?? []);
        const user: UserData = userData.data;
        form.reset({
          email: user.email,
          fullName: user.fullName,
          fullNameAr: user.fullNameAr || '',
          jobTitle: user.jobTitle || '',
          phone: user.phone || '',
          roleId: user.role?.id || '',
          status: user.status,
          password: '',
        });
        setSelectedDeptId(user.department?.id || '');
        setProfileImage(user.profileImage || null);
        setLoadingUser(false);
      })
      .catch((err) => {
        if (err.message === 'not-found' || err.message === 'forbidden') return;
        toast.error(t('errors.networkError'));
        router.push(`/${locale}/users`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('errors.fileTooLarge'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('errors.fileTypeNotAllowed'));
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch(`/api/users/${userId}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      const { data } = await response.json();
      setProfileImage(data.profileImage);
      toast.success(t('messages.updateSuccess', { entity: t('users.profileImage') }));
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePermission = (name: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const toggleGroup = (key: string, allNames: string[]) => {
    const allChecked = allNames.every((n) => selectedPermissions.includes(n));
    if (allChecked) {
      setSelectedPermissions((prev) => prev.filter((p) => !allNames.includes(p)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...allNames])]);
    }
  };

  const toggleGroupExpand = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyRolePreset = async () => {
    const roleId = form.getValues('roleId');
    if (!roleId) return;
    setLoadingRolePreset(true);
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`);
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setSelectedPermissions(data ?? []);
      toast.success(t('permissions.loadedSuccess'));
    } catch {
      toast.error(t('permissions.loadFailed'));
    } finally {
      setLoadingRolePreset(false);
    }
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const selectAllPermissions = () => {
    const all = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.name));
    setSelectedPermissions(all);
  };

  const onSubmit = async (data: UpdateUserForm) => {
    setIsLoading(true);
    try {
      const submitData: Record<string, unknown> = { ...data };
      if (!submitData.password) delete submitData.password;
      submitData.departmentId = selectedDeptId || null;

      const [userRes, permsRes] = await Promise.all([
        fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData),
        }),
        fetch(`/api/users/${userId}/permissions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: selectedPermissions }),
        }),
      ]);

      if (!userRes.ok) {
        const error = await userRes.json();
        toast.error(getApiErrorMessage(error.error || '', t));
        return;
      }
      if (!permsRes.ok) {
        toast.error(t('permissions.saveFailed'));
        return;
      }

      toast.success(t('messages.updateSuccess', { entity: t('users.title') }));
      router.push(`/${locale}/users`);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingUser) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-3 md:p-3.5">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <PageHeader
        icon={UserCog}
        title={t('users.edit')}
        subtitle={form.getValues('fullName')}
        actions={
          <Button
            variant="outline"
            onClick={() => router.push(`/${locale}/users`)}
          >
            <ArrowLeft className="size-4 me-2 rtl:-scale-x-100" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="p-5 space-y-5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Image */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="size-5 text-primary" />
                {t('users.profileImage')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="size-24 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="size-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-2xl border-2 border-border">
                      {form.getValues('fullName')?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {uploadingImage ? (
                      <Loader2 className="size-6 text-white animate-spin" />
                    ) : (
                      <Camera className="size-6 text-white" />
                    )}
                  </button>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <Loader2 className="size-4 me-2 animate-spin" />
                    ) : (
                      <Camera className="size-4 me-2" />
                    )}
                    {t('users.changePhoto')}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    JPG, PNG, GIF - Max 5MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5 text-primary" />
                {t('users.fullName')}
              </CardTitle>
              <CardDescription>
                {t('common.email')} {t('common.and')} {t('common.phone')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name EN */}
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.fullName')} (EN) *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} dir="ltr" disabled={isLoading} className="ps-10" placeholder="Ahmed Mohamed" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Full Name AR */}
                <FormField
                  control={form.control}
                  name="fullNameAr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.fullName')} (AR)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} dir="rtl" disabled={isLoading} className="ps-10" placeholder="أحمد محمد" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.email')} *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} type="email" disabled={isLoading} className="ps-10" placeholder="email@company.com" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Job Title */}
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.jobTitle')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Briefcase className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} disabled={isLoading} className="ps-10" placeholder={t('users.jobTitle')} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.phone')}</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value || ''}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security & Role */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                {t('users.role')} {t('common.and')} {t('auth.password')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t('auth.new_password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input {...field} type="password" disabled={isLoading} className="ps-10" placeholder="••••••••" />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t('common.passwordKeepCurrent')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Role */}
                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('users.role')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2">
                              <Shield className="size-4 text-muted-foreground" />
                              <SelectValue placeholder={t('common.select')} />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">{t('users.statusActive')}</SelectItem>
                          <SelectItem value="DISABLED">{t('users.statusDisabled')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Department */}
                <FormItem>
                  <FormLabel>{t('departments.title')}</FormLabel>
                  <Select
                    value={selectedDeptId || 'NONE'}
                    onValueChange={(val) => setSelectedDeptId(val === 'NONE' ? '' : val)}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground" />
                          <SelectValue placeholder={t('common.select')} />
                        </div>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">-</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {locale === 'ar' && dept.nameAr ? dept.nameAr : dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="shadow-premium">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="size-5 text-primary" />
                    {t('permissions.title')}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t('permissions.description')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyRolePreset}
                    disabled={loadingRolePreset || !form.watch('roleId')}
                  >
                    {loadingRolePreset ? (
                      <Loader2 className="size-3.5 me-1.5 animate-spin" />
                    ) : (
                      <Shield className="size-3.5 me-1.5" />
                    )}
                    {t('permissions.loadRolePreset')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={selectAllPermissions}
                  >
                    <CheckCheck className="size-3.5 me-1.5" />
                    {t('permissions.selectAll')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllPermissions}
                  >
                    <X className="size-3.5 me-1.5" />
                    {t('permissions.clearAll')}
                  </Button>
                </div>
              </div>
              {selectedPermissions.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                    {t('permissions.selectedCount', { count: selectedPermissions.length })}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {PERMISSION_GROUPS.map((group) => {
                const groupPermNames = group.permissions.map((p) => p.name);
                const checkedCount = groupPermNames.filter((n) => selectedPermissions.includes(n)).length;
                const allChecked = checkedCount === groupPermNames.length;
                const someChecked = checkedCount > 0 && !allChecked;
                const isExpanded = expandedGroups[group.key] !== false; // default expanded

                return (
                  <div key={group.key} className="border border-border rounded-xl overflow-hidden">
                    {/* Group header */}
                    <div
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors ${
                        allChecked ? 'bg-primary/8' : someChecked ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/30'
                      } hover:bg-muted/50`}
                      onClick={() => toggleGroupExpand(group.key)}
                    >
                      <div className="flex items-center gap-3">
                        {/* Group checkbox */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleGroup(group.key, groupPermNames); }}
                          className={`size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            allChecked
                              ? 'bg-primary border-primary'
                              : someChecked
                              ? 'bg-amber-400 border-amber-400'
                              : 'border-muted-foreground/40 hover:border-primary'
                          }`}
                        >
                          {allChecked && <span className="text-white text-[11px] font-bold">✓</span>}
                          {someChecked && <span className="text-white text-[11px] font-bold">−</span>}
                        </button>
                        <div>
                          <span className="font-semibold text-sm">
                            {locale === 'ar' ? group.labelAr : group.labelEn}
                          </span>
                          <span className="text-xs text-muted-foreground ms-2">
                            {checkedCount}/{groupPermNames.length}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Permission list */}
                    {isExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
                        {group.permissions.map((perm) => {
                          const checked = selectedPermissions.includes(perm.name);
                          return (
                            <button
                              key={perm.name}
                              type="button"
                              onClick={() => togglePermission(perm.name)}
                              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-all text-start ${
                                checked
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                              }`}
                            >
                              <div className={`size-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                checked ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                              }`}>
                                {checked && <span className="text-white text-[9px] font-bold">✓</span>}
                              </div>
                              <span className="truncate leading-tight">
                                {locale === 'ar' ? perm.labelAr : perm.labelEn}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/${locale}/users`)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[140px] btn-premium">
              {isLoading ? (
                <>
                  <Loader2 className="size-4 me-2 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="size-4 me-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      </div>
      </div>
    </div>
  );
}
