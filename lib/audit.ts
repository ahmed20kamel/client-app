import { prisma } from './prisma';

export interface AuditLogData {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
}

export async function logAudit({
  actorUserId,
  action,
  entityType,
  entityId,
  before,
  after,
}: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        before: before ? JSON.stringify(before) : null,
        after: after ? JSON.stringify(after) : null,
      },
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

export async function getAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};

  if (filters?.entityType) where.entityType = filters.entityType;
  if (filters?.entityId) where.entityId = filters.entityId;
  if (filters?.actorUserId) where.actorUserId = filters.actorUserId;

  return await prisma.auditLog.findMany({
    where,
    include: {
      actor: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
    skip: filters?.offset || 0,
  });
}
