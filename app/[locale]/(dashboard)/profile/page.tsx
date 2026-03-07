'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Shield,
  Camera,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Calendar,
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  jobTitle: string | null;
  phone: string | null;
  profileImage: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; name: string } | null;
  department: { id: string; name: string; nameAr: string | null } | null;
}

export default function ProfilePage() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.data) {
        setProfile(data.data);
        setFullName(data.data.fullName);
        setPhone(data.data.phone || '');
        setJobTitle(data.data.jobTitle || '');
      }
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge'));
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      const data = await res.json();
      setProfile(prev => prev ? { ...prev, profileImage: data.data.profileImage } : null);
      toast.success(t('profile.imageUpdated'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, jobTitle }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      await fetchProfile();
      toast.success(t('profile.profileUpdated'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('profile.passwordTooShort'));
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || t('common.error'));
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success(t('profile.passwordChanged'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setChangingPassword(false);
    }
  };

  const initials = profile?.fullName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-6 lg:mb-8">
        {t('profile.title')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile Card */}
        <div className="lg:col-span-1">
          <Card className="shadow-premium">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative group mb-4">
                {profile.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.fullName}
                    className="w-28 h-28 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary border-4 border-primary/20 shadow-lg">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingImage ? (
                    <Loader2 className="size-6 text-white animate-spin" />
                  ) : (
                    <Camera className="size-6 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              <h2 className="text-xl font-bold">{profile.fullName}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>

              {/* Role & Department badges */}
              <div className="flex flex-wrap gap-2 mt-3 justify-center">
                {profile.role && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Shield className="size-3" />
                    {profile.role.name}
                  </span>
                )}
                {profile.department && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-info/10 text-info">
                    <Building2 className="size-3" />
                    {locale === 'ar' && profile.department.nameAr
                      ? profile.department.nameAr
                      : profile.department.name}
                  </span>
                )}
              </div>

              {/* Meta info */}
              <div className="w-full mt-6 space-y-3 text-start">
                {profile.jobTitle && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="size-4 text-muted-foreground shrink-0" />
                    <span>{profile.jobTitle}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <span dir="ltr">{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {t('profile.memberSince')} {new Date(profile.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Edit Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="size-5 text-primary" />
                {t('profile.personalInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.fullName')}</label>
                  <div className="relative">
                    <User className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="ps-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('common.email')}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={profile.email}
                      disabled
                      className="ps-10 bg-muted/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('common.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="ps-10"
                      placeholder="+971"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.jobTitle')}</label>
                  <div className="relative">
                    <Briefcase className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      className="ps-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveProfile} disabled={saving} className="btn-premium">
                  {saving ? (
                    <>
                      <Loader2 className="size-4 me-2 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <Save className="size-4 me-2" />
                      {t('profile.saveChanges')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5 text-primary" />
                {t('profile.changePassword')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('profile.currentPassword')}</label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="ps-10 pe-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.newPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="ps-10 pe-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('profile.confirmPassword')}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="ps-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                  variant="outline"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="size-4 me-2 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      <Lock className="size-4 me-2" />
                      {t('profile.updatePassword')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
