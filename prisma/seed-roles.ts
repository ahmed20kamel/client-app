/**
 * Non-destructive seed — upserts all permissions and 5 predefined roles.
 * Run with: npm run db:seed-roles
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── All permissions ───────────────────────────────────────────────────────────
export const ALL_PERMISSIONS = [
  // ── Page access ──────────────────────────────────────────────────────────
  { name: 'page.dashboard',       resource: 'page', action: 'view', description: 'الوصول إلى لوحة التحكم' },
  { name: 'page.customers',       resource: 'page', action: 'view', description: 'الوصول إلى العملاء' },
  { name: 'page.tasks',           resource: 'page', action: 'view', description: 'الوصول إلى المهام' },
  { name: 'page.approvals',       resource: 'page', action: 'view', description: 'الوصول إلى الموافقات' },
  { name: 'page.clients',         resource: 'page', action: 'view', description: 'الوصول إلى الشركات' },
  { name: 'page.quotations',      resource: 'page', action: 'view', description: 'الوصول إلى عروض الأسعار' },
  { name: 'page.tax-invoices',    resource: 'page', action: 'view', description: 'الوصول إلى الفواتير الضريبية' },
  { name: 'page.delivery-notes',  resource: 'page', action: 'view', description: 'الوصول إلى مذكرات التسليم' },
  { name: 'page.inventory',       resource: 'page', action: 'view', description: 'الوصول إلى المخزون' },
  { name: 'page.suppliers',       resource: 'page', action: 'view', description: 'الوصول إلى الموردين' },
  { name: 'page.purchase-orders', resource: 'page', action: 'view', description: 'الوصول إلى أوامر الشراء' },
  { name: 'page.reports',         resource: 'page', action: 'view', description: 'الوصول إلى التقارير' },
  { name: 'page.accounts',        resource: 'page', action: 'view', description: 'الوصول إلى الحسابات' },
  { name: 'page.performance',     resource: 'page', action: 'view', description: 'الوصول إلى الأداء' },
  { name: 'page.work-orders',     resource: 'page', action: 'view', description: 'الوصول إلى أوامر العمل' },

  // ── Quotations ───────────────────────────────────────────────────────────
  { name: 'quotation.view.all',   resource: 'quotation', action: 'view',   scope: 'all', description: 'عرض جميع عروض الأسعار' },
  { name: 'quotation.view.own',   resource: 'quotation', action: 'view',   scope: 'own', description: 'عرض عروض الأسعار الخاصة' },
  { name: 'quotation.create',     resource: 'quotation', action: 'create',              description: 'إنشاء عروض الأسعار' },
  { name: 'quotation.edit.all',   resource: 'quotation', action: 'edit',   scope: 'all', description: 'تعديل أي عرض سعر' },
  { name: 'quotation.edit.own',   resource: 'quotation', action: 'edit',   scope: 'own', description: 'تعديل عروض الأسعار الخاصة' },
  { name: 'quotation.delete.all', resource: 'quotation', action: 'delete', scope: 'all', description: 'حذف أي عرض سعر' },
  { name: 'quotation.send',       resource: 'quotation', action: 'send',                description: 'إرسال عرض السعر للعميل' },
  { name: 'quotation.approve',    resource: 'quotation', action: 'approve',             description: 'اعتماد وتأكيد عروض الأسعار' },

  // ── Customers ────────────────────────────────────────────────────────────
  { name: 'customer.view.all',    resource: 'customer', action: 'view',   scope: 'all', description: 'عرض جميع العملاء' },
  { name: 'customer.view.own',    resource: 'customer', action: 'view',   scope: 'own', description: 'عرض العملاء الخاصين' },
  { name: 'customer.create',      resource: 'customer', action: 'create',              description: 'إضافة عملاء جدد' },
  { name: 'customer.edit.all',    resource: 'customer', action: 'edit',   scope: 'all', description: 'تعديل أي عميل' },
  { name: 'customer.edit.own',    resource: 'customer', action: 'edit',   scope: 'own', description: 'تعديل العملاء الخاصين' },
  { name: 'customer.delete.all',  resource: 'customer', action: 'delete', scope: 'all', description: 'حذف أي عميل' },
  { name: 'customer.assign-owner',resource: 'customer', action: 'assign-owner',        description: 'إعادة تعيين مسؤول العميل' },

  // ── Clients (companies) ──────────────────────────────────────────────────
  { name: 'client.view.all',      resource: 'client', action: 'view',   scope: 'all', description: 'عرض جميع الشركات' },
  { name: 'client.create',        resource: 'client', action: 'create',              description: 'إضافة شركات جديدة' },
  { name: 'client.edit.all',      resource: 'client', action: 'edit',   scope: 'all', description: 'تعديل أي شركة' },
  { name: 'client.delete.all',    resource: 'client', action: 'delete', scope: 'all', description: 'حذف أي شركة' },

  // ── Tasks ────────────────────────────────────────────────────────────────
  { name: 'task.view.all',        resource: 'task', action: 'view',   scope: 'all', description: 'عرض جميع المهام' },
  { name: 'task.view.own',        resource: 'task', action: 'view',   scope: 'own', description: 'عرض المهام الخاصة' },
  { name: 'task.create',          resource: 'task', action: 'create',              description: 'إنشاء مهام' },
  { name: 'task.edit.all',        resource: 'task', action: 'edit',   scope: 'all', description: 'تعديل أي مهمة' },
  { name: 'task.edit.own',        resource: 'task', action: 'edit',   scope: 'own', description: 'تعديل المهام الخاصة' },

  // ── Internal Tasks ───────────────────────────────────────────────────────
  { name: 'internal-task.create',     resource: 'internal-task', action: 'create',              description: 'إنشاء مهام داخلية' },
  { name: 'internal-task.read',       resource: 'internal-task', action: 'read',   scope: 'all', description: 'عرض جميع المهام الداخلية' },
  { name: 'internal-task.read.own',   resource: 'internal-task', action: 'read',   scope: 'own', description: 'عرض المهام الداخلية الخاصة' },
  { name: 'internal-task.update',     resource: 'internal-task', action: 'update', scope: 'all', description: 'تحديث أي مهمة داخلية' },
  { name: 'internal-task.update.own', resource: 'internal-task', action: 'update', scope: 'own', description: 'تحديث المهام الداخلية الخاصة' },
  { name: 'internal-task.delete',     resource: 'internal-task', action: 'delete',              description: 'حذف المهام الداخلية' },
  { name: 'internal-task.approve',    resource: 'internal-task', action: 'approve',             description: 'اعتماد المهام الداخلية' },
  { name: 'internal-task.rate',       resource: 'internal-task', action: 'rate',                description: 'تقييم الموظفين على المهام' },

  // ── Inventory ────────────────────────────────────────────────────────────
  { name: 'inventory.view',           resource: 'inventory', action: 'view',   description: 'عرض المخزون' },
  { name: 'inventory.manage',         resource: 'inventory', action: 'manage', description: 'إدارة المخزون (إضافة/تعديل)' },

  // ── Reports & Performance ────────────────────────────────────────────────
  { name: 'reports.view.all',         resource: 'reports',     action: 'view',   scope: 'all', description: 'عرض جميع التقارير' },
  { name: 'reports.view.own',         resource: 'reports',     action: 'view',   scope: 'own', description: 'عرض التقارير الخاصة' },
  { name: 'performance.create',       resource: 'performance', action: 'create',              description: 'إنشاء تقييمات الأداء' },
  { name: 'performance.read',         resource: 'performance', action: 'read',   scope: 'all', description: 'عرض جميع تقييمات الأداء' },
  { name: 'performance.read.own',     resource: 'performance', action: 'read',   scope: 'own', description: 'عرض تقييمات الأداء الخاصة' },
  { name: 'performance.update',       resource: 'performance', action: 'update',              description: 'تحديث تقييمات الأداء' },

  // ── System ───────────────────────────────────────────────────────────────
  { name: 'user.manage',             resource: 'user',  action: 'manage', description: 'إدارة المستخدمين والصلاحيات' },
  { name: 'audit.view',              resource: 'audit', action: 'view',   description: 'عرض سجل التدقيق' },
] as const;

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES: Record<string, { labelAr: string; description: string; permissions: string[] }> = {

  'سوبر ادمن': {
    labelAr: 'سوبر ادمن',
    description: 'Super Administrator — full access to everything',
    permissions: ALL_PERMISSIONS.map(p => p.name),
  },

  'ادمن': {
    labelAr: 'ادمن',
    description: 'Administrator — full operational access',
    permissions: ALL_PERMISSIONS.map(p => p.name),
  },

  'محاسب': {
    labelAr: 'محاسب',
    description: 'Accountant — invoices, accounts, and financial reports',
    permissions: [
      'page.dashboard', 'page.quotations', 'page.tax-invoices',
      'page.delivery-notes', 'page.reports', 'page.accounts',
      'quotation.view.all',
      'customer.view.all',
      'client.view.all',
      'inventory.view',
      'reports.view.all',
      'internal-task.read.own', 'internal-task.update.own',
    ],
  },

  'مبيعات': {
    labelAr: 'مبيعات',
    description: 'Sales engineer — manage own quotations and customers',
    permissions: [
      'page.dashboard', 'page.clients', 'page.customers', 'page.quotations',
      'page.tasks', 'page.approvals', 'page.work-orders',
      'page.tax-invoices', 'page.delivery-notes', 'page.inventory',
      'quotation.create', 'quotation.view.own', 'quotation.edit.own', 'quotation.send',
      'customer.create', 'customer.view.own', 'customer.edit.own',
      'client.view.all', 'client.create',
      'task.create', 'task.view.own', 'task.edit.own',
      'internal-task.create', 'internal-task.read.own', 'internal-task.update.own',
      'inventory.view',
      'reports.view.own',
    ],
  },

  'مهندس': {
    labelAr: 'مهندس',
    description: 'Engineer — work orders, delivery notes, and inventory',
    permissions: [
      'page.dashboard', 'page.quotations', 'page.work-orders',
      'page.clients', 'page.inventory', 'page.delivery-notes',
      'quotation.view.all',
      'client.view.all',
      'inventory.view', 'inventory.manage',
      'internal-task.create', 'internal-task.read.own', 'internal-task.update.own',
    ],
  },
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔐 Seeding permissions and roles (non-destructive)…\n');

  // 1. Upsert all permissions
  console.log('Upserting permissions…');
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where:  { name: perm.name },
      update: { description: perm.description },
      create: {
        name:        perm.name,
        resource:    perm.resource,
        action:      perm.action,
        scope:       (perm as any).scope ?? null,
        description: perm.description,
      },
    });
  }
  console.log(`✓ ${ALL_PERMISSIONS.length} permissions ready\n`);

  // 2. Upsert roles and assign their permissions
  for (const [roleName, def] of Object.entries(ROLES)) {
    const role = await prisma.role.upsert({
      where:  { name: roleName },
      update: { description: def.description },
      create: { name: roleName, description: def.description, isSystem: false },
    });
    console.log(`Role: ${roleName}`);

    // Assign permissions to role
    let added = 0;
    for (const permName of def.permissions) {
      const permission = await prisma.permission.findUnique({ where: { name: permName } });
      if (!permission) { console.warn(`  ⚠ Missing: ${permName}`); continue; }
      await prisma.rolePermission.upsert({
        where:  { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
      added++;
    }
    console.log(`  ✓ ${added} permissions assigned\n`);
  }

  // 3. Ensure legacy Admin and Employee roles also get new permissions
  const legacyAdmin = await prisma.role.findUnique({ where: { name: 'Admin' } });
  if (legacyAdmin) {
    const allPerms = await prisma.permission.findMany();
    let n = 0;
    for (const perm of allPerms) {
      const exists = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId: legacyAdmin.id, permissionId: perm.id } },
      });
      if (!exists) {
        await prisma.rolePermission.create({ data: { roleId: legacyAdmin.id, permissionId: perm.id } });
        n++;
      }
    }
    if (n) console.log(`Admin role: ${n} new permissions added ✓`);
  }

  console.log('\n✅ Done!');
  console.log('   Roles: سوبر ادمن | ادمن | محاسب | مبيعات | مهندس');
  console.log('   → Users → Edit → choose role preset, then customize permissions');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
