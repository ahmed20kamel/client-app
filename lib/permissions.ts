import { prisma } from './prisma';

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
  { name: 'page.work-orders',    label: 'Work Orders',     icon: 'ClipboardList' },
] as const;

export type PagePermissionName = typeof PAGE_PERMISSIONS[number]['name'];

export async function getUserPermissions(userId: string) {
  const [rolePerms, directPerms] = await Promise.all([
    prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    }),
    prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    }),
  ]);

  const fromRoles = rolePerms.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission)
  );
  const fromDirect = directPerms.map((up) => up.permission);

  const seen = new Set<string>();
  return [...fromRoles, ...fromDirect].filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export async function getUserPagePermissions(userId: string): Promise<string[]> {
  const perms = await getUserPermissions(userId);
  return perms.filter((p) => p.name.startsWith('page.')).map((p) => p.name);
}

export async function can(
  userId: string,
  permission: string,
  resource?: any
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  const hasPermission = userPermissions.some((p) => p.name === permission);
  if (!hasPermission) return false;

  if (permission.includes('.own') && resource) {
    return (
      resource.ownerId === userId ||
      resource.assignedToId === userId ||
      resource.createdById === userId
    );
  }

  return true;
}

export async function requirePermission(
  userId: string,
  permission: string,
  resource?: any
) {
  const allowed = await can(userId, permission, resource);
  if (!allowed) throw new Error('Forbidden');
}

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const userRole = await prisma.userRole.findFirst({
    where: { userId, role: { name: roleName } },
  });
  return !!userRole;
}
