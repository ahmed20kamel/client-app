import { prisma } from './prisma';

// ── Page permissions (used for sidebar visibility) ────────────────────────────
export const PAGE_PERMISSIONS = [
  { name: 'page.dashboard',       label: 'Dashboard',       icon: 'LayoutDashboard' },
  { name: 'page.customers',       label: 'Customers',       icon: 'Users' },
  { name: 'page.tasks',           label: 'Tasks',           icon: 'CheckSquare' },
  { name: 'page.approvals',       label: 'Approvals',       icon: 'CheckCircle2' },
  { name: 'page.clients',         label: 'Clients',         icon: 'Building2' },
  { name: 'page.quotations',      label: 'Quotations',      icon: 'FileText' },
  { name: 'page.tax-invoices',    label: 'Tax Invoices',    icon: 'Receipt' },
  { name: 'page.delivery-notes',  label: 'Delivery Notes',  icon: 'Package2' },
  { name: 'page.inventory',       label: 'Inventory',       icon: 'Package' },
  { name: 'page.suppliers',       label: 'Suppliers',       icon: 'Truck' },
  { name: 'page.purchase-orders', label: 'Purchase Orders', icon: 'ShoppingCart' },
  { name: 'page.reports',         label: 'Reports',         icon: 'BarChart3' },
  { name: 'page.accounts',        label: 'Accounts',        icon: 'Wallet' },
  { name: 'page.performance',     label: 'Performance',     icon: 'TrendingUp' },
  { name: 'page.work-orders',     label: 'Work Orders',     icon: 'ClipboardList' },
] as const;

export type PagePermissionName = typeof PAGE_PERMISSIONS[number]['name'];

// ── Permission groups (for the UI in user edit page) ──────────────────────────
export const PERMISSION_GROUPS = [
  {
    key: 'page',
    labelEn: 'Page Access',
    labelAr: 'الوصول للصفحات',
    icon: 'LayoutDashboard',
    permissions: [
      { name: 'page.dashboard',       labelAr: 'لوحة التحكم' },
      { name: 'page.quotations',      labelAr: 'عروض الأسعار' },
      { name: 'page.clients',         labelAr: 'الشركات' },
      { name: 'page.customers',       labelAr: 'العملاء' },
      { name: 'page.tasks',           labelAr: 'المهام' },
      { name: 'page.approvals',       labelAr: 'الموافقات' },
      { name: 'page.work-orders',     labelAr: 'أوامر العمل' },
      { name: 'page.tax-invoices',    labelAr: 'الفواتير الضريبية' },
      { name: 'page.delivery-notes',  labelAr: 'مذكرات التسليم' },
      { name: 'page.inventory',       labelAr: 'المخزون' },
      { name: 'page.suppliers',       labelAr: 'الموردين' },
      { name: 'page.purchase-orders', labelAr: 'أوامر الشراء' },
      { name: 'page.reports',         labelAr: 'التقارير' },
      { name: 'page.accounts',        labelAr: 'الحسابات' },
      { name: 'page.performance',     labelAr: 'الأداء' },
    ],
  },
  {
    key: 'quotation',
    labelEn: 'Quotations',
    labelAr: 'عروض الأسعار',
    icon: 'FileText',
    permissions: [
      { name: 'quotation.view.all',   labelAr: 'عرض جميع العروض' },
      { name: 'quotation.view.own',   labelAr: 'عرض العروض الخاصة' },
      { name: 'quotation.create',     labelAr: 'إنشاء عروض' },
      { name: 'quotation.edit.all',   labelAr: 'تعديل أي عرض' },
      { name: 'quotation.edit.own',   labelAr: 'تعديل العروض الخاصة' },
      { name: 'quotation.send',       labelAr: 'إرسال للعميل' },
      { name: 'quotation.approve',    labelAr: 'اعتماد وتأكيد' },
      { name: 'quotation.delete.all', labelAr: 'حذف العروض' },
    ],
  },
  {
    key: 'customer',
    labelEn: 'Customers',
    labelAr: 'العملاء',
    icon: 'Users',
    permissions: [
      { name: 'customer.view.all',     labelAr: 'عرض جميع العملاء' },
      { name: 'customer.view.own',     labelAr: 'عرض العملاء الخاصين' },
      { name: 'customer.create',       labelAr: 'إضافة عملاء' },
      { name: 'customer.edit.all',     labelAr: 'تعديل أي عميل' },
      { name: 'customer.edit.own',     labelAr: 'تعديل العملاء الخاصين' },
      { name: 'customer.delete.all',   labelAr: 'حذف العملاء' },
      { name: 'customer.assign-owner', labelAr: 'إعادة تعيين المسؤول' },
    ],
  },
  {
    key: 'client',
    labelEn: 'Clients (Companies)',
    labelAr: 'الشركات',
    icon: 'Building2',
    permissions: [
      { name: 'client.view.all',   labelAr: 'عرض جميع الشركات' },
      { name: 'client.create',     labelAr: 'إضافة شركات' },
      { name: 'client.edit.all',   labelAr: 'تعديل الشركات' },
      { name: 'client.delete.all', labelAr: 'حذف الشركات' },
    ],
  },
  {
    key: 'task',
    labelEn: 'Tasks',
    labelAr: 'المهام',
    icon: 'CheckSquare',
    permissions: [
      { name: 'task.view.all',  labelAr: 'عرض جميع المهام' },
      { name: 'task.view.own',  labelAr: 'عرض المهام الخاصة' },
      { name: 'task.create',    labelAr: 'إنشاء مهام' },
      { name: 'task.edit.all',  labelAr: 'تعديل أي مهمة' },
      { name: 'task.edit.own',  labelAr: 'تعديل المهام الخاصة' },
    ],
  },
  {
    key: 'internal-task',
    labelEn: 'Internal Tasks',
    labelAr: 'المهام الداخلية',
    icon: 'ClipboardList',
    permissions: [
      { name: 'internal-task.create',     labelAr: 'إنشاء مهام داخلية' },
      { name: 'internal-task.read',       labelAr: 'عرض جميع المهام الداخلية' },
      { name: 'internal-task.read.own',   labelAr: 'عرض المهام الداخلية الخاصة' },
      { name: 'internal-task.update',     labelAr: 'تحديث أي مهمة داخلية' },
      { name: 'internal-task.update.own', labelAr: 'تحديث المهام الداخلية الخاصة' },
      { name: 'internal-task.delete',     labelAr: 'حذف المهام الداخلية' },
      { name: 'internal-task.approve',    labelAr: 'اعتماد المهام الداخلية' },
      { name: 'internal-task.rate',       labelAr: 'تقييم الموظفين' },
    ],
  },
  {
    key: 'inventory',
    labelEn: 'Inventory',
    labelAr: 'المخزون',
    icon: 'Package',
    permissions: [
      { name: 'inventory.view',   labelAr: 'عرض المخزون' },
      { name: 'inventory.manage', labelAr: 'إدارة المخزون' },
    ],
  },
  {
    key: 'reports',
    labelEn: 'Reports & Performance',
    labelAr: 'التقارير والأداء',
    icon: 'BarChart3',
    permissions: [
      { name: 'reports.view.all',     labelAr: 'عرض جميع التقارير' },
      { name: 'reports.view.own',     labelAr: 'عرض التقارير الخاصة' },
      { name: 'performance.create',   labelAr: 'إنشاء تقييمات الأداء' },
      { name: 'performance.read',     labelAr: 'عرض جميع تقييمات الأداء' },
      { name: 'performance.read.own', labelAr: 'عرض تقييمات الأداء الخاصة' },
      { name: 'performance.update',   labelAr: 'تحديث تقييمات الأداء' },
    ],
  },
  {
    key: 'system',
    labelEn: 'System',
    labelAr: 'النظام',
    icon: 'Shield',
    permissions: [
      { name: 'user.manage', labelAr: 'إدارة المستخدمين والصلاحيات' },
      { name: 'audit.view',  labelAr: 'عرض سجل التدقيق' },
    ],
  },
] as const;

// ── Core permission functions ─────────────────────────────────────────────────

export async function getUserPermissions(userId: string) {
  const [rolePerms, directPerms] = await Promise.all([
    prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    }),
    prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    }),
  ]);

  const fromRoles  = rolePerms.flatMap(ur => ur.role.permissions.map(rp => rp.permission));
  const fromDirect = directPerms.map(up => up.permission);

  // If the user has explicit direct permissions, use ONLY those.
  // This gives admins full control — selecting a role preset auto-fills direct permissions.
  // If no direct permissions exist (e.g. legacy Admin), fall back to role-based.
  const source = fromDirect.length > 0 ? fromDirect : [...fromRoles, ...fromDirect];

  const seen = new Set<string>();
  return source.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export async function getUserPagePermissions(userId: string): Promise<string[]> {
  const perms = await getUserPermissions(userId);
  return perms.filter(p => p.name.startsWith('page.')).map(p => p.name);
}

export async function can(
  userId: string,
  permission: string,
  resource?: any
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  const hasPermission   = userPermissions.some(p => p.name === permission);
  if (!hasPermission) return false;

  if (permission.includes('.own') && resource) {
    return (
      resource.ownerId      === userId ||
      resource.assignedToId === userId ||
      resource.createdById  === userId
    );
  }

  return true;
}

export async function requirePermission(userId: string, permission: string, resource?: any) {
  const allowed = await can(userId, permission, resource);
  if (!allowed) throw new Error('Forbidden');
}

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const userRole = await prisma.userRole.findFirst({
    where: { userId, role: { name: roleName } },
  });
  return !!userRole;
}
