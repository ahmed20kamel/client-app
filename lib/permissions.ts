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
  { name: 'page.payments',        label: 'Payments',        icon: 'CreditCard' },
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
      { name: 'page.dashboard',       labelEn: 'Dashboard',        labelAr: 'لوحة التحكم' },
      { name: 'page.quotations',      labelEn: 'Quotations',       labelAr: 'عروض الأسعار' },
      { name: 'page.clients',         labelEn: 'Clients',          labelAr: 'الشركات' },
      { name: 'page.customers',       labelEn: 'Customers',        labelAr: 'العملاء' },
      { name: 'page.tasks',           labelEn: 'Tasks',            labelAr: 'المهام' },
      { name: 'page.approvals',       labelEn: 'Approvals',        labelAr: 'الموافقات' },
      { name: 'page.work-orders',     labelEn: 'Work Orders',      labelAr: 'أوامر العمل' },
      { name: 'page.tax-invoices',    labelEn: 'Tax Invoices',     labelAr: 'الفواتير الضريبية' },
      { name: 'page.delivery-notes',  labelEn: 'Delivery Notes',   labelAr: 'مذكرات التسليم' },
      { name: 'page.inventory',       labelEn: 'Inventory',        labelAr: 'المخزون' },
      { name: 'page.suppliers',       labelEn: 'Suppliers',        labelAr: 'الموردين' },
      { name: 'page.purchase-orders', labelEn: 'Purchase Orders',  labelAr: 'أوامر الشراء' },
      { name: 'page.reports',         labelEn: 'Reports',          labelAr: 'التقارير' },
      { name: 'page.accounts',        labelEn: 'Accounts',         labelAr: 'الحسابات' },
      { name: 'page.performance',     labelEn: 'Performance',      labelAr: 'الأداء' },
      { name: 'page.payments',        labelEn: 'Payments',         labelAr: 'المدفوعات' },
    ],
  },
  {
    key: 'quotation',
    labelEn: 'Quotations',
    labelAr: 'عروض الأسعار',
    icon: 'FileText',
    permissions: [
      { name: 'quotation.view.all',   labelEn: 'View all quotations',   labelAr: 'عرض جميع العروض' },
      { name: 'quotation.view.own',   labelEn: 'View own quotations',   labelAr: 'عرض العروض الخاصة' },
      { name: 'quotation.create',     labelEn: 'Create quotations',     labelAr: 'إنشاء عروض' },
      { name: 'quotation.edit.all',   labelEn: 'Edit any quotation',    labelAr: 'تعديل أي عرض' },
      { name: 'quotation.edit.own',   labelEn: 'Edit own quotations',   labelAr: 'تعديل العروض الخاصة' },
      { name: 'quotation.send',       labelEn: 'Send to client',        labelAr: 'إرسال للعميل' },
      { name: 'quotation.approve',    labelEn: 'Approve & confirm',     labelAr: 'اعتماد وتأكيد' },
      { name: 'quotation.delete.all', labelEn: 'Delete quotations',     labelAr: 'حذف العروض' },
    ],
  },
  {
    key: 'customer',
    labelEn: 'Customers',
    labelAr: 'العملاء',
    icon: 'Users',
    permissions: [
      { name: 'customer.view.all',     labelEn: 'View all customers',    labelAr: 'عرض جميع العملاء' },
      { name: 'customer.view.own',     labelEn: 'View own customers',    labelAr: 'عرض العملاء الخاصين' },
      { name: 'customer.create',       labelEn: 'Add customers',         labelAr: 'إضافة عملاء' },
      { name: 'customer.edit.all',     labelEn: 'Edit any customer',     labelAr: 'تعديل أي عميل' },
      { name: 'customer.edit.own',     labelEn: 'Edit own customers',    labelAr: 'تعديل العملاء الخاصين' },
      { name: 'customer.delete.all',   labelEn: 'Delete customers',      labelAr: 'حذف العملاء' },
      { name: 'customer.assign-owner', labelEn: 'Reassign responsible',  labelAr: 'إعادة تعيين المسؤول' },
    ],
  },
  {
    key: 'client',
    labelEn: 'Clients (Companies)',
    labelAr: 'الشركات',
    icon: 'Building2',
    permissions: [
      { name: 'client.view.all',   labelEn: 'View all clients',  labelAr: 'عرض جميع الشركات' },
      { name: 'client.create',     labelEn: 'Add clients',       labelAr: 'إضافة شركات' },
      { name: 'client.edit.all',   labelEn: 'Edit clients',      labelAr: 'تعديل الشركات' },
      { name: 'client.delete.all', labelEn: 'Delete clients',    labelAr: 'حذف الشركات' },
    ],
  },
  {
    key: 'task',
    labelEn: 'Tasks',
    labelAr: 'المهام',
    icon: 'CheckSquare',
    permissions: [
      { name: 'task.view.all',  labelEn: 'View all tasks',   labelAr: 'عرض جميع المهام' },
      { name: 'task.view.own',  labelEn: 'View own tasks',   labelAr: 'عرض المهام الخاصة' },
      { name: 'task.create',    labelEn: 'Create tasks',     labelAr: 'إنشاء مهام' },
      { name: 'task.edit.all',  labelEn: 'Edit any task',    labelAr: 'تعديل أي مهمة' },
      { name: 'task.edit.own',  labelEn: 'Edit own tasks',   labelAr: 'تعديل المهام الخاصة' },
    ],
  },
  {
    key: 'internal-task',
    labelEn: 'Internal Tasks',
    labelAr: 'المهام الداخلية',
    icon: 'ClipboardList',
    permissions: [
      { name: 'internal-task.create',     labelEn: 'Create internal tasks',      labelAr: 'إنشاء مهام داخلية' },
      { name: 'internal-task.read',       labelEn: 'View all internal tasks',    labelAr: 'عرض جميع المهام الداخلية' },
      { name: 'internal-task.read.own',   labelEn: 'View own internal tasks',    labelAr: 'عرض المهام الداخلية الخاصة' },
      { name: 'internal-task.update',     labelEn: 'Update any internal task',   labelAr: 'تحديث أي مهمة داخلية' },
      { name: 'internal-task.update.own', labelEn: 'Update own internal tasks',  labelAr: 'تحديث المهام الداخلية الخاصة' },
      { name: 'internal-task.delete',     labelEn: 'Delete internal tasks',      labelAr: 'حذف المهام الداخلية' },
      { name: 'internal-task.approve',    labelEn: 'Approve internal tasks',     labelAr: 'اعتماد المهام الداخلية' },
      { name: 'internal-task.rate',       labelEn: 'Rate employees',             labelAr: 'تقييم الموظفين' },
    ],
  },
  {
    key: 'inventory',
    labelEn: 'Inventory',
    labelAr: 'المخزون',
    icon: 'Package',
    permissions: [
      { name: 'inventory.view',   labelEn: 'View inventory',   labelAr: 'عرض المخزون' },
      { name: 'inventory.manage', labelEn: 'Manage inventory', labelAr: 'إدارة المخزون' },
    ],
  },
  {
    key: 'reports',
    labelEn: 'Reports & Performance',
    labelAr: 'التقارير والأداء',
    icon: 'BarChart3',
    permissions: [
      { name: 'reports.view.all',     labelEn: 'View all reports',          labelAr: 'عرض جميع التقارير' },
      { name: 'reports.view.own',     labelEn: 'View own reports',          labelAr: 'عرض التقارير الخاصة' },
      { name: 'performance.create',   labelEn: 'Create performance reviews', labelAr: 'إنشاء تقييمات الأداء' },
      { name: 'performance.read',     labelEn: 'View all reviews',          labelAr: 'عرض جميع تقييمات الأداء' },
      { name: 'performance.read.own', labelEn: 'View own reviews',          labelAr: 'عرض تقييمات الأداء الخاصة' },
      { name: 'performance.update',   labelEn: 'Update reviews',            labelAr: 'تحديث تقييمات الأداء' },
    ],
  },
  {
    key: 'system',
    labelEn: 'System',
    labelAr: 'النظام',
    icon: 'Shield',
    permissions: [
      { name: 'user.manage', labelEn: 'Manage users & permissions', labelAr: 'إدارة المستخدمين والصلاحيات' },
      { name: 'audit.view',  labelEn: 'View audit log',             labelAr: 'عرض سجل التدقيق' },
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
