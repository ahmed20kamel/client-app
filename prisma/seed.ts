import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean existing data
  console.log('Cleaning existing data...');
  // Procurement & Sales
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  // Inventory
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.supplier.deleteMany();
  // Performance & Tasks
  await prisma.performanceReview.deleteMany();
  await prisma.taskRating.deleteMany();
  await prisma.internalTaskComment.deleteMany();
  await prisma.internalTask.deleteMany();
  await prisma.escalationRule.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskCategory.deleteMany();
  await prisma.userDepartment.deleteMany();
  await prisma.department.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  // Create Permissions
  console.log('Creating permissions...');
  const permissions = await Promise.all([
    prisma.permission.create({
      data: { name: 'customer.view.all', resource: 'customer', action: 'view', scope: 'all', description: 'View all customers' },
    }),
    prisma.permission.create({
      data: { name: 'customer.view.own', resource: 'customer', action: 'view', scope: 'own', description: 'View own customers only' },
    }),
    prisma.permission.create({
      data: { name: 'customer.create', resource: 'customer', action: 'create', description: 'Create customers' },
    }),
    prisma.permission.create({
      data: { name: 'customer.edit.all', resource: 'customer', action: 'edit', scope: 'all', description: 'Edit all customers' },
    }),
    prisma.permission.create({
      data: { name: 'customer.edit.own', resource: 'customer', action: 'edit', scope: 'own', description: 'Edit own customers only' },
    }),
    prisma.permission.create({
      data: { name: 'customer.delete.all', resource: 'customer', action: 'delete', scope: 'all', description: 'Delete any customer' },
    }),
    prisma.permission.create({
      data: { name: 'customer.assign-owner', resource: 'customer', action: 'assign-owner', description: 'Reassign customer owner' },
    }),
    prisma.permission.create({
      data: { name: 'task.view.all', resource: 'task', action: 'view', scope: 'all', description: 'View all tasks' },
    }),
    prisma.permission.create({
      data: { name: 'task.view.own', resource: 'task', action: 'view', scope: 'own', description: 'View own tasks only' },
    }),
    prisma.permission.create({
      data: { name: 'task.create', resource: 'task', action: 'create', description: 'Create tasks' },
    }),
    prisma.permission.create({
      data: { name: 'task.edit.all', resource: 'task', action: 'edit', scope: 'all', description: 'Edit all tasks' },
    }),
    prisma.permission.create({
      data: { name: 'task.edit.own', resource: 'task', action: 'edit', scope: 'own', description: 'Edit own tasks only' },
    }),
    prisma.permission.create({
      data: { name: 'user.manage', resource: 'user', action: 'manage', description: 'Manage users (Admin only)' },
    }),
    prisma.permission.create({
      data: { name: 'reports.view.all', resource: 'reports', action: 'view', scope: 'all', description: 'View all reports' },
    }),
    prisma.permission.create({
      data: { name: 'reports.view.own', resource: 'reports', action: 'view', scope: 'own', description: 'View own reports only' },
    }),
    prisma.permission.create({
      data: { name: 'audit.view', resource: 'audit', action: 'view', description: 'View audit logs' },
    }),
    // Internal Task permissions
    prisma.permission.create({
      data: { name: 'internal-task.create', resource: 'internal-task', action: 'create', description: 'Create internal tasks' },
    }),
    prisma.permission.create({
      data: { name: 'internal-task.read', resource: 'internal-task', action: 'read', scope: 'all', description: 'View all internal tasks' },
    }),
    prisma.permission.create({
      data: { name: 'internal-task.read.own', resource: 'internal-task', action: 'read', scope: 'own', description: 'View own internal tasks' },
    }),
    prisma.permission.create({
      data: { name: 'internal-task.update', resource: 'internal-task', action: 'update', scope: 'all', description: 'Update any internal task' },
    }),
    prisma.permission.create({
      data: { name: 'internal-task.update.own', resource: 'internal-task', action: 'update', scope: 'own', description: 'Update own internal tasks' },
    }),
    prisma.permission.create({
      data: { name: 'internal-task.delete', resource: 'internal-task', action: 'delete', description: 'Delete internal tasks' },
    }),
    prisma.permission.create({
      data: { name: 'internal-task.approve', resource: 'internal-task', action: 'approve', description: 'Approve or reject internal tasks' },
    }),
    prisma.permission.create({
      data: { name: 'internal-task.rate', resource: 'internal-task', action: 'rate', description: 'Rate employees on internal tasks' },
    }),
    // Performance permissions
    prisma.permission.create({
      data: { name: 'performance.create', resource: 'performance', action: 'create', description: 'Create performance reviews' },
    }),
    prisma.permission.create({
      data: { name: 'performance.read', resource: 'performance', action: 'read', scope: 'all', description: 'View all performance reviews' },
    }),
    prisma.permission.create({
      data: { name: 'performance.read.own', resource: 'performance', action: 'read', scope: 'own', description: 'View own performance reviews' },
    }),
    prisma.permission.create({
      data: { name: 'performance.update', resource: 'performance', action: 'update', description: 'Update performance reviews' },
    }),
  ]);

  console.log(`Created ${permissions.length} permissions`);

  // Create Roles
  console.log('Creating roles...');
  const adminRole = await prisma.role.create({
    data: { name: 'Admin', description: 'Administrator with full access', isSystem: true },
  });

  const employeeRole = await prisma.role.create({
    data: { name: 'Employee', description: 'Regular employee with limited access', isSystem: true },
  });

  // Assign all permissions to Admin
  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: permission.id },
      })
    )
  );

  // Assign limited permissions to Employee
  const employeePermissionNames = [
    'internal-task.read.own', 'internal-task.update.own',
  ];
  const employeePermissions = permissions.filter((p) => employeePermissionNames.includes(p.name));
  await Promise.all(
    employeePermissions.map((permission) =>
      prisma.rolePermission.create({
        data: { roleId: employeeRole.id, permissionId: permission.id },
      })
    )
  );

  // Create Admin User
  console.log('Creating users...');
  const adminPassword = await hash('Admin123!', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@stride.com',
      fullName: 'System Administrator',
      jobTitle: 'Administrator',
      passwordHash: adminPassword,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id } });

  // Create Employee User (Ali)
  const employeePassword = await hash('Employee123!', 10);
  const employeeUser = await prisma.user.create({
    data: {
      email: 'ali@stride.com',
      fullName: 'Ali',
      jobTitle: 'Sales Agent',
      phone: '+971501234567',
      passwordHash: employeePassword,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { userId: employeeUser.id, roleId: employeeRole.id } });

  // Create Departments
  console.log('Creating departments...');
  const salesDept = await prisma.department.create({
    data: {
      name: 'Sales',
      nameAr: 'المبيعات',
      description: 'Sales and business development team',
      managerId: adminUser.id,
    },
  });

  const engineeringDept = await prisma.department.create({
    data: {
      name: 'Engineering',
      nameAr: 'الهندسة',
      description: 'Technical engineering and estimation team',
      managerId: adminUser.id,
    },
  });

  const supportDept = await prisma.department.create({
    data: {
      name: 'Customer Support',
      nameAr: 'دعم العملاء',
      description: 'Customer support and after-sales team',
      managerId: adminUser.id,
    },
  });

  const managementDept = await prisma.department.create({
    data: {
      name: 'Management',
      nameAr: 'الإدارة',
      description: 'Executive management',
      managerId: adminUser.id,
    },
  });

  const hrDept = await prisma.department.create({
    data: {
      name: 'HR',
      nameAr: 'الموارد البشرية',
      description: 'Human Resources department',
      managerId: adminUser.id,
    },
  });

  const accountsDept = await prisma.department.create({
    data: {
      name: 'Accounts',
      nameAr: 'الحسابات',
      description: 'Accounts and Finance department',
      managerId: adminUser.id,
    },
  });

  const projectEngDept = await prisma.department.create({
    data: {
      name: 'Project Eng.',
      nameAr: 'هندسة المشاريع',
      description: 'Project Engineering department',
      managerId: adminUser.id,
    },
  });

  const aluminumDept = await prisma.department.create({
    data: {
      name: 'Aluminmum',
      nameAr: 'الألمنيوم',
      description: 'Aluminum department',
      managerId: adminUser.id,
    },
  });

  console.log('Created 8 departments');

  // Create new employees
  console.log('Creating new employees...');
  const mohamedMalikPassword = await hash('MO@1234', 10);
  const mohamedMalik = await prisma.user.create({
    data: {
      email: 'mohamed.malik@stride.com',
      fullName: 'MOHAMED MALIK',
      jobTitle: 'HR Officer',
      passwordHash: mohamedMalikPassword,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { userId: mohamedMalik.id, roleId: employeeRole.id } });

  const ansarPassword = await hash('AN@1234', 10);
  const ansar = await prisma.user.create({
    data: {
      email: 'ansar.abdulrahman@stride.com',
      fullName: 'ANSAR ABDULRAHMAN',
      jobTitle: 'Accountant',
      passwordHash: ansarPassword,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { userId: ansar.id, roleId: employeeRole.id } });

  const yaseenPassword = await hash('YA@1234', 10);
  const yaseen = await prisma.user.create({
    data: {
      email: 'yaseen.nisar@stride.com',
      fullName: 'YASEEN NISAR NISAR AHMAD',
      jobTitle: 'Project Engineer',
      passwordHash: yaseenPassword,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { userId: yaseen.id, roleId: employeeRole.id } });

  const islamPassword = await hash('IS@1234', 10);
  const islam = await prisma.user.create({
    data: {
      email: 'islam.hamdy@stride.com',
      fullName: 'ISLAM HAMDY',
      jobTitle: 'Sales Executive',
      passwordHash: islamPassword,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { userId: islam.id, roleId: employeeRole.id } });

  const mohamedElsayedPassword = await hash('MO@1234', 10);
  const mohamedElsayed = await prisma.user.create({
    data: {
      email: 'mohamed.elsayed@stride.com',
      fullName: 'Mohamed Elsayed',
      jobTitle: 'Project Engineer',
      passwordHash: mohamedElsayedPassword,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { userId: mohamedElsayed.id, roleId: employeeRole.id } });

  const haithamPassword = await hash('HA@1234', 10);
  const haitham = await prisma.user.create({
    data: {
      email: 'haitham@stride.com',
      fullName: 'Haitham',
      jobTitle: 'Aluminum Specialist',
      passwordHash: haithamPassword,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.create({ data: { userId: haitham.id, roleId: employeeRole.id } });

  console.log('Created 6 new employees');

  // Assign users to departments
  await prisma.userDepartment.create({
    data: { userId: adminUser.id, departmentId: managementDept.id, isPrimary: true },
  });
  await prisma.userDepartment.create({
    data: { userId: employeeUser.id, departmentId: salesDept.id, isPrimary: true },
  });
  await prisma.userDepartment.create({
    data: { userId: mohamedMalik.id, departmentId: hrDept.id, isPrimary: true },
  });
  await prisma.userDepartment.create({
    data: { userId: ansar.id, departmentId: accountsDept.id, isPrimary: true },
  });
  await prisma.userDepartment.create({
    data: { userId: yaseen.id, departmentId: projectEngDept.id, isPrimary: true },
  });
  await prisma.userDepartment.create({
    data: { userId: islam.id, departmentId: salesDept.id, isPrimary: true },
  });
  await prisma.userDepartment.create({
    data: { userId: mohamedElsayed.id, departmentId: projectEngDept.id, isPrimary: true },
  });
  await prisma.userDepartment.create({
    data: { userId: haitham.id, departmentId: aluminumDept.id, isPrimary: true },
  });

  // Create Task Categories
  console.log('Creating task categories...');
  const followUpCategory = await prisma.taskCategory.create({
    data: { name: 'Follow Up', nameAr: 'متابعة', color: '#3b82f6', icon: 'phone' },
  });
  const siteVisitCategory = await prisma.taskCategory.create({
    data: { name: 'Site Visit', nameAr: 'زيارة موقع', color: '#10b981', icon: 'map-pin' },
  });
  const docReviewCategory = await prisma.taskCategory.create({
    data: { name: 'Document Review', nameAr: 'مراجعة مستندات', color: '#f59e0b', icon: 'file-text' },
  });
  const techAssessCategory = await prisma.taskCategory.create({
    data: { name: 'Technical Assessment', nameAr: 'تقييم فني', color: '#8b5cf6', icon: 'clipboard-check' },
  });
  const collectionCategory = await prisma.taskCategory.create({
    data: { name: 'Collection', nameAr: 'تحصيل', color: '#ef4444', icon: 'banknote' },
  });

  console.log('Created 5 task categories');

  // Create Escalation Rules
  console.log('Creating escalation rules...');
  await prisma.escalationRule.create({
    data: {
      name: 'Overdue 24h - Notify Manager',
      description: 'Notify department manager when task is overdue by 24 hours',
      departmentId: salesDept.id,
      triggerType: 'OVERDUE_HOURS',
      triggerValue: 24,
      action: 'NOTIFY_MANAGER',
      isActive: true,
    },
  });
  await prisma.escalationRule.create({
    data: {
      name: 'Overdue 48h - Escalate Priority',
      description: 'Escalate task priority when overdue by 48 hours',
      departmentId: salesDept.id,
      triggerType: 'OVERDUE_HOURS',
      triggerValue: 48,
      action: 'ESCALATE_PRIORITY',
      targetPriority: 'HIGH',
      isActive: true,
    },
  });
  await prisma.escalationRule.create({
    data: {
      name: 'Overdue 3 days - Notify Team',
      description: 'Notify entire team when task is overdue by 3 days',
      triggerType: 'OVERDUE_DAYS',
      triggerValue: 3,
      action: 'NOTIFY_TEAM',
      isActive: true,
    },
  });
  await prisma.escalationRule.create({
    data: {
      name: 'Overdue 5 days - Reassign',
      description: 'Reassign task to manager when overdue by 5 days',
      departmentId: engineeringDept.id,
      triggerType: 'OVERDUE_DAYS',
      triggerValue: 5,
      action: 'REASSIGN',
      isActive: true,
    },
  });

  console.log('Created 4 escalation rules');

  // Create sample leads matching the Excel data
  console.log('Creating sample leads...');

  const lead1 = await prisma.customer.create({
    data: {
      fullName: 'Yousif Alzaby',
      contactPerson: 'Yousif',
      phone: '501840600',
      customerType: 'TYPE_A',
      status: 'QUOTATION_SENT',
      emirate: 'ABU_DHABI',
      projectType: 'VILLA',
      productType: 'FRAMIX_LGSF',
      leadSource: 'INSTAGRAM',
      estimatedValue: 1200000,
      probability: 30,
      weightedValue: 360000,
      projectSize: 1444,
      lastFollowUp: new Date('2026-01-27'),
      nextFollowUp: new Date('2026-02-22'),
      ownerId: employeeUser.id,
      createdById: adminUser.id,
      createdAt: new Date('2026-01-24'),
    },
  });

  const lead2 = await prisma.customer.create({
    data: {
      fullName: 'Saeed Alnyadi',
      company: 'Arkal Consultant',
      contactPerson: 'Eng Hussain Abu Assali',
      phone: '565343438',
      customerType: 'TYPE_A',
      status: 'QUOTATION_SENT',
      emirate: 'AL_AIN',
      projectType: 'VILLA',
      productType: 'FRAMIX_LGSF',
      leadSource: 'CONSULTANT',
      estimatedValue: 640000,
      probability: 30,
      weightedValue: 192000,
      consultant: 'Arkal Engineering',
      projectSize: 731,
      lastFollowUp: new Date('2026-01-27'),
      nextFollowUp: new Date('2026-02-22'),
      ownerId: employeeUser.id,
      createdById: employeeUser.id,
      createdAt: new Date('2026-01-16'),
    },
  });

  const lead3 = await prisma.customer.create({
    data: {
      fullName: 'Badr',
      contactPerson: 'Badr',
      phone: '503113144',
      customerType: 'TYPE_A',
      status: 'QUOTATION_SENT',
      emirate: 'ABU_DHABI',
      projectType: 'ANNEX',
      productType: 'FRAMIX_LGSF',
      leadSource: 'INSTAGRAM',
      estimatedValue: 225000,
      probability: 30,
      weightedValue: 67500,
      projectSize: 126,
      lastFollowUp: new Date('2026-01-28'),
      nextFollowUp: new Date('2026-02-22'),
      ownerId: employeeUser.id,
      createdById: employeeUser.id,
      createdAt: new Date('2026-01-20'),
    },
  });

  const lead4 = await prisma.customer.create({
    data: {
      fullName: 'Salim',
      contactPerson: 'Salim',
      phone: '506111104',
      customerType: 'TYPE_A',
      status: 'QUOTATION_SENT',
      emirate: 'ABU_DHABI',
      projectType: 'GUARD_ROOM',
      productType: 'FRAMIX_LGSF',
      leadSource: 'INSTAGRAM',
      estimatedValue: 50000,
      probability: 30,
      weightedValue: 15000,
      projectSize: 24,
      lastFollowUp: new Date('2026-02-01'),
      nextFollowUp: new Date('2026-02-22'),
      ownerId: employeeUser.id,
      createdById: employeeUser.id,
      createdAt: new Date('2026-02-01'),
    },
  });

  console.log('Created 4 sample leads');

  // Create sample tasks with categories and departments
  console.log('Creating sample tasks...');
  const task1 = await prisma.task.create({
    data: {
      title: 'Follow up with Yousif Alzaby',
      description: 'Call to discuss villa quotation',
      customerId: lead1.id,
      assignedToId: employeeUser.id,
      createdById: employeeUser.id,
      dueAt: new Date('2026-02-22'),
      priority: 'HIGH',
      status: 'OPEN',
      categoryId: followUpCategory.id,
      departmentId: salesDept.id,
      slaDeadline: new Date('2026-02-25'),
    },
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Follow up with Saeed - Arkal project',
      description: 'Coordinate with Arkal Engineering consultant',
      customerId: lead2.id,
      assignedToId: employeeUser.id,
      createdById: employeeUser.id,
      dueAt: new Date('2026-02-22'),
      priority: 'HIGH',
      status: 'OPEN',
      categoryId: followUpCategory.id,
      departmentId: salesDept.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Send revised quote to Badr',
      description: 'Annex project quotation revision',
      customerId: lead3.id,
      assignedToId: employeeUser.id,
      createdById: employeeUser.id,
      dueAt: new Date('2026-02-22'),
      priority: 'MEDIUM',
      status: 'OPEN',
      categoryId: docReviewCategory.id,
      departmentId: salesDept.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Follow up with Salim - Guard Room',
      description: 'Discuss guard room specifications',
      customerId: lead4.id,
      assignedToId: employeeUser.id,
      createdById: employeeUser.id,
      dueAt: new Date('2026-02-22'),
      priority: 'MEDIUM',
      status: 'OPEN',
      categoryId: techAssessCategory.id,
      departmentId: engineeringDept.id,
    },
  });

  // Create an overdue task for escalation testing
  await prisma.task.create({
    data: {
      title: 'Site visit for Yousif villa project',
      description: 'Visit the villa construction site for assessment',
      customerId: lead1.id,
      assignedToId: employeeUser.id,
      createdById: adminUser.id,
      dueAt: new Date('2026-02-20'),
      priority: 'HIGH',
      status: 'OVERDUE',
      categoryId: siteVisitCategory.id,
      departmentId: engineeringDept.id,
      escalationLevel: 1,
    },
  });

  console.log('Created 5 sample tasks');

  // Create sample task comments
  console.log('Creating sample task comments...');
  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: employeeUser.id,
      content: 'Called client, no answer. Will try again tomorrow.',
      type: 'COMMENT',
    },
  });
  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: adminUser.id,
      content: 'Please prioritize this client - high value project.',
      type: 'COMMENT',
    },
  });
  await prisma.taskComment.create({
    data: {
      taskId: task2.id,
      userId: employeeUser.id,
      content: 'Task created',
      type: 'SYSTEM',
      metadata: JSON.stringify({ action: 'created' }),
    },
  });

  console.log('Created 3 sample comments');

  // Create sample notifications
  console.log('Creating sample notifications...');
  await prisma.notification.create({
    data: {
      userId: employeeUser.id,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned',
      message: 'You have been assigned: Follow up with Yousif Alzaby',
      link: '/en/tasks/' + task1.id,
      isRead: false,
    },
  });
  await prisma.notification.create({
    data: {
      userId: employeeUser.id,
      type: 'TASK_DUE',
      title: 'Task due soon',
      message: 'Task "Follow up with Saeed" is due tomorrow',
      link: '/en/tasks/' + task2.id,
      isRead: true,
      readAt: new Date(),
    },
  });
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      type: 'TASK_ESCALATED',
      title: 'Task escalated',
      message: 'Task "Site visit for Yousif" has been escalated to level 1',
      link: '/en/tasks/' + task1.id,
      isRead: false,
    },
  });

  console.log('Created 3 sample notifications');

  // Create sample internal tasks
  console.log('Creating sample internal tasks...');
  const internalTask1 = await prisma.internalTask.create({
    data: {
      title: 'Prepare monthly sales report',
      description: 'Compile all sales data for January and prepare a comprehensive report',
      assignedToId: employeeUser.id,
      createdById: adminUser.id,
      departmentId: salesDept.id,
      categoryId: docReviewCategory.id,
      status: 'DONE',
      priority: 'HIGH',
      dueAt: new Date('2026-02-10'),
      submittedAt: new Date('2026-02-08'),
      approvedAt: new Date('2026-02-09'),
      completedAt: new Date('2026-02-09'),
      approvedById: adminUser.id,
    },
  });

  const internalTask2 = await prisma.internalTask.create({
    data: {
      title: 'Update CRM customer data',
      description: 'Verify and update all customer contact information',
      assignedToId: employeeUser.id,
      createdById: adminUser.id,
      departmentId: salesDept.id,
      status: 'SUBMITTED',
      priority: 'MEDIUM',
      dueAt: new Date('2026-03-01'),
      submittedAt: new Date('2026-02-25'),
    },
  });

  const internalTask3 = await prisma.internalTask.create({
    data: {
      title: 'Review engineering specifications',
      description: 'Review the LGSF specifications document for accuracy',
      assignedToId: employeeUser.id,
      createdById: adminUser.id,
      departmentId: engineeringDept.id,
      categoryId: techAssessCategory.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueAt: new Date('2026-03-05'),
    },
  });

  await prisma.internalTask.create({
    data: {
      title: 'Organize team building event',
      description: 'Plan and organize the quarterly team building activity',
      assignedToId: employeeUser.id,
      createdById: adminUser.id,
      departmentId: managementDept.id,
      status: 'OPEN',
      priority: 'LOW',
      dueAt: new Date('2026-03-15'),
    },
  });

  await prisma.internalTask.create({
    data: {
      title: 'Complete safety training',
      description: 'Finish the online safety training course',
      assignedToId: employeeUser.id,
      createdById: adminUser.id,
      departmentId: engineeringDept.id,
      status: 'REJECTED',
      priority: 'MEDIUM',
      dueAt: new Date('2026-02-28'),
      submittedAt: new Date('2026-02-26'),
      rejectionReason: 'Training certification document is missing. Please attach it and resubmit.',
    },
  });

  console.log('Created 5 sample internal tasks');

  // Create internal task comments
  console.log('Creating internal task comments...');
  await prisma.internalTaskComment.create({
    data: {
      internalTaskId: internalTask1.id,
      userId: adminUser.id,
      content: 'Task created',
      type: 'SYSTEM',
    },
  });
  await prisma.internalTaskComment.create({
    data: {
      internalTaskId: internalTask1.id,
      userId: employeeUser.id,
      content: 'Report is ready for review',
      type: 'SUBMISSION',
    },
  });
  await prisma.internalTaskComment.create({
    data: {
      internalTaskId: internalTask1.id,
      userId: adminUser.id,
      content: 'Excellent work! Report approved.',
      type: 'APPROVAL',
    },
  });
  await prisma.internalTaskComment.create({
    data: {
      internalTaskId: internalTask2.id,
      userId: employeeUser.id,
      content: 'Updated 85% of the records, submitting for review',
      type: 'COMMENT',
    },
  });

  console.log('Created 4 internal task comments');

  // Create task rating for the completed task
  console.log('Creating task ratings...');
  await prisma.taskRating.create({
    data: {
      internalTaskId: internalTask1.id,
      ratedById: adminUser.id,
      ratedUserId: employeeUser.id,
      rating: 5,
      comment: 'Excellent report, very thorough and well-structured',
    },
  });

  console.log('Created 1 task rating');

  // Create a performance review
  console.log('Creating performance reviews...');
  await prisma.performanceReview.create({
    data: {
      userId: employeeUser.id,
      reviewerId: adminUser.id,
      period: 'MONTHLY',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      overallRating: 4,
      strengths: 'Strong client communication skills, consistent follow-ups',
      improvements: 'Could improve documentation quality and time management',
      notes: 'Good performance overall. Recommend for advanced sales training.',
      tasksCompleted: 8,
      tasksOnTime: 7,
      averageRating: 4.2,
      status: 'PUBLISHED',
    },
  });

  console.log('Created 1 performance review');
  console.log('\nDatabase seeding completed successfully!');
  console.log('\nLogin Credentials:');
  console.log('  Admin:              admin@stride.com / Admin123!');
  console.log('  Ali (Employee):     ali@stride.com / Employee123!');
  console.log('  MOHAMED MALIK:      mohamed.malik@stride.com / MO@1234');
  console.log('  ANSAR ABDULRAHMAN:  ansar.abdulrahman@stride.com / AN@1234');
  console.log('  YASEEN NISAR:       yaseen.nisar@stride.com / YA@1234');
  console.log('  ISLAM HAMDY:        islam.hamdy@stride.com / IS@1234');
  console.log('  Mohamed Elsayed:    mohamed.elsayed@stride.com / MO@1234');
  console.log('  Haitham:            haitham@stride.com / HA@1234');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
