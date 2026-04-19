/**
 * Non-destructive seed: upserts roles and permissions without wiping data.
 * Run with: npm run db:seed-roles
 *
 * Creates/updates:
 *  - All page.* permissions
 *  - All quotation.* permissions
 *  - Sales role  → sales engineer access
 *  - Manager role → view-all + approve access
 *  - Ensures Admin role has every permission
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── Permission definitions ────────────────────────────────────────────────────

const ALL_PERMISSIONS = [
  // Page access
  { name: 'page.dashboard',       resource: 'page', action: 'view', description: 'Access Dashboard' },
  { name: 'page.customers',       resource: 'page', action: 'view', description: 'Access Customers' },
  { name: 'page.tasks',           resource: 'page', action: 'view', description: 'Access Tasks' },
  { name: 'page.approvals',       resource: 'page', action: 'view', description: 'Access Approvals' },
  { name: 'page.clients',         resource: 'page', action: 'view', description: 'Access Clients' },
  { name: 'page.quotations',      resource: 'page', action: 'view', description: 'Access Quotations' },
  { name: 'page.tax-invoices',    resource: 'page', action: 'view', description: 'Access Tax Invoices' },
  { name: 'page.delivery-notes',  resource: 'page', action: 'view', description: 'Access Delivery Notes' },
  { name: 'page.inventory',       resource: 'page', action: 'view', description: 'Access Inventory' },
  { name: 'page.suppliers',       resource: 'page', action: 'view', description: 'Access Suppliers' },
  { name: 'page.purchase-orders', resource: 'page', action: 'view', description: 'Access Purchase Orders' },
  { name: 'page.reports',         resource: 'page', action: 'view', description: 'Access Reports' },
  { name: 'page.accounts',        resource: 'page', action: 'view', description: 'Access Accounts' },
  { name: 'page.performance',     resource: 'page', action: 'view', description: 'Access Performance' },
  { name: 'page.work-orders',     resource: 'page', action: 'view', description: 'Access Work Orders' },

  // Quotation
  { name: 'quotation.view.all',   resource: 'quotation', action: 'view',   scope: 'all', description: 'View all quotations' },
  { name: 'quotation.view.own',   resource: 'quotation', action: 'view',   scope: 'own', description: 'View own quotations' },
  { name: 'quotation.create',     resource: 'quotation', action: 'create',               description: 'Create quotations' },
  { name: 'quotation.edit.all',   resource: 'quotation', action: 'edit',   scope: 'all', description: 'Edit any quotation' },
  { name: 'quotation.edit.own',   resource: 'quotation', action: 'edit',   scope: 'own', description: 'Edit own quotations' },
  { name: 'quotation.delete.all', resource: 'quotation', action: 'delete', scope: 'all', description: 'Delete any quotation' },
  { name: 'quotation.send',       resource: 'quotation', action: 'send',                 description: 'Send quotation to client' },
  { name: 'quotation.approve',    resource: 'quotation', action: 'approve',               description: 'Approve/confirm quotations' },

  // Client
  { name: 'client.view.all',  resource: 'client', action: 'view',   scope: 'all', description: 'View all clients' },
  { name: 'client.create',    resource: 'client', action: 'create',               description: 'Create clients' },
  { name: 'client.edit.all',  resource: 'client', action: 'edit',   scope: 'all', description: 'Edit any client' },
  { name: 'client.delete.all',resource: 'client', action: 'delete', scope: 'all', description: 'Delete any client' },

  // Inventory
  { name: 'inventory.view',   resource: 'inventory', action: 'view',   description: 'View inventory' },
  { name: 'inventory.manage', resource: 'inventory', action: 'manage', description: 'Manage inventory (add/edit)' },
] as const;

// ── Role definitions ──────────────────────────────────────────────────────────

const ROLE_DEFINITIONS: Record<string, { description: string; permissions: string[] }> = {
  Sales: {
    description: 'Sales engineer — create and manage own quotations',
    permissions: [
      // Pages visible in sidebar
      'page.dashboard', 'page.clients', 'page.customers', 'page.quotations',
      'page.tasks', 'page.approvals', 'page.work-orders',
      'page.tax-invoices', 'page.delivery-notes', 'page.inventory',
      // Quotation actions
      'quotation.create', 'quotation.view.own', 'quotation.edit.own', 'quotation.send',
      // Customer actions (own)
      'customer.create', 'customer.view.own', 'customer.edit.own',
      // Task actions (own)
      'task.create', 'task.view.own', 'task.edit.own',
      // Internal tasks
      'internal-task.create', 'internal-task.read.own', 'internal-task.update.own',
      // Read-only on shared resources
      'client.view.all', 'inventory.view',
    ],
  },

  Manager: {
    description: 'Manager — view all records, approve quotations',
    permissions: [
      // All pages
      'page.dashboard', 'page.clients', 'page.customers', 'page.quotations',
      'page.tasks', 'page.approvals', 'page.work-orders', 'page.tax-invoices',
      'page.delivery-notes', 'page.inventory', 'page.reports', 'page.performance',
      // Quotation — full view + approve
      'quotation.view.all', 'quotation.edit.all', 'quotation.create',
      'quotation.send', 'quotation.approve', 'quotation.delete.all',
      // Customers — full
      'customer.view.all', 'customer.edit.all', 'customer.create',
      'customer.delete.all', 'customer.assign-owner',
      // Tasks — full
      'task.view.all', 'task.edit.all', 'task.create',
      // Internal tasks — full
      'internal-task.create', 'internal-task.read', 'internal-task.update',
      'internal-task.delete', 'internal-task.approve', 'internal-task.rate',
      // Clients
      'client.view.all', 'client.create', 'client.edit.all',
      // Inventory
      'inventory.view',
      // Reports & Performance
      'reports.view.all', 'performance.create', 'performance.read',
      'performance.update', 'performance.read.own',
    ],
  },
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔐 Seeding roles and permissions (non-destructive)...\n');

  // 1. Upsert all permissions
  console.log('Creating/updating permissions...');
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
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
  console.log(`✓ ${ALL_PERMISSIONS.length} permissions upserted\n`);

  // 2. Upsert Sales and Manager roles with their permissions
  for (const [roleName, def] of Object.entries(ROLE_DEFINITIONS)) {
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
      if (!permission) {
        console.warn(`  ⚠ Permission not found: ${permName} (skipping)`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where:  { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
      added++;
    }
    console.log(`  ✓ ${added} permissions assigned\n`);
  }

  // 3. Ensure Admin role has every permission in the DB
  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  if (adminRole) {
    const allPerms = await prisma.permission.findMany();
    let adminAdded = 0;
    for (const perm of allPerms) {
      const exists = await prisma.rolePermission.findUnique({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      });
      if (!exists) {
        await prisma.rolePermission.create({
          data: { roleId: adminRole.id, permissionId: perm.id },
        });
        adminAdded++;
      }
    }
    console.log(`Admin role: ${adminAdded} new permissions added ✓\n`);
  }

  console.log('✅ Done! Roles available: Admin, Manager, Sales, Employee');
  console.log('   → Go to Users → Edit user → assign role, then tick page permissions');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
