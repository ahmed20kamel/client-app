import { prisma } from '@/lib/prisma';

interface EscalationResult {
  processed: number;
  escalated: number;
  notified: number;
  errors: string[];
}

export async function processEscalations(): Promise<EscalationResult> {
  const result: EscalationResult = { processed: 0, escalated: 0, notified: 0, errors: [] };

  try {
    // Get all active escalation rules
    const rules = await prisma.escalationRule.findMany({
      where: { isActive: true },
      include: { department: { select: { id: true, managerId: true, name: true } } },
      orderBy: { triggerValue: 'asc' },
    });

    if (rules.length === 0) return result;

    // Get overdue tasks that haven't been completed or canceled
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: { in: ['OPEN', 'OVERDUE'] },
        dueAt: { lt: new Date() },
      },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        department: { select: { id: true, managerId: true, name: true } },
      },
    });

    for (const task of overdueTasks) {
      result.processed++;

      const now = new Date();
      const overdueMs = now.getTime() - new Date(task.dueAt).getTime();
      const overdueHours = overdueMs / (1000 * 60 * 60);
      const overdueDays = overdueHours / 24;

      // Find applicable rules (matching department or global)
      const applicableRules = rules.filter((rule) => {
        if (rule.departmentId && rule.departmentId !== task.departmentId) return false;

        const threshold = rule.triggerType === 'OVERDUE_HOURS'
          ? rule.triggerValue
          : rule.triggerValue * 24;

        return overdueHours >= threshold;
      });

      for (const rule of applicableRules) {
        try {
          switch (rule.action) {
            case 'ESCALATE_PRIORITY': {
              if (rule.targetPriority && task.priority !== rule.targetPriority) {
                const newLevel = Math.min(task.escalationLevel + 1, 2);
                await prisma.task.update({
                  where: { id: task.id },
                  data: {
                    priority: rule.targetPriority,
                    escalationLevel: newLevel,
                    status: 'OVERDUE',
                  },
                });

                await prisma.taskComment.create({
                  data: {
                    taskId: task.id,
                    userId: task.assignedTo.id,
                    content: `Auto-escalated: Priority changed to ${rule.targetPriority} (Rule: ${rule.name})`,
                    type: 'ESCALATION',
                    metadata: JSON.stringify({
                      ruleId: rule.id,
                      ruleName: rule.name,
                      previousPriority: task.priority,
                      newPriority: rule.targetPriority,
                      overdueHours: Math.round(overdueHours),
                    }),
                  },
                });
                result.escalated++;
              }
              break;
            }

            case 'NOTIFY_MANAGER': {
              const managerId = rule.department?.managerId || task.department?.managerId;
              if (managerId) {
                await prisma.notification.create({
                  data: {
                    userId: managerId,
                    type: 'TASK_ESCALATED',
                    title: 'Overdue task requires attention',
                    message: `Task "${task.title}" is overdue by ${Math.round(overdueHours)}h (Rule: ${rule.name})`,
                    link: `/en/tasks/${task.id}`,
                  },
                });
                result.notified++;
              }
              break;
            }

            case 'NOTIFY_TEAM': {
              const deptId = rule.departmentId || task.departmentId;
              if (deptId) {
                const teamMembers = await prisma.userDepartment.findMany({
                  where: { departmentId: deptId },
                  select: { userId: true },
                });

                for (const member of teamMembers) {
                  await prisma.notification.create({
                    data: {
                      userId: member.userId,
                      type: 'TASK_ESCALATED',
                      title: 'Team alert: Overdue task',
                      message: `Task "${task.title}" is overdue by ${Math.round(overdueDays)} days`,
                      link: `/en/tasks/${task.id}`,
                    },
                  });
                  result.notified++;
                }
              }
              break;
            }

            case 'REASSIGN': {
              const managerId = rule.department?.managerId || task.department?.managerId;
              if (managerId && managerId !== task.assignedToId) {
                const manager = await prisma.user.findUnique({
                  where: { id: managerId },
                  select: { id: true, fullName: true },
                });

                if (manager) {
                  await prisma.task.update({
                    where: { id: task.id },
                    data: {
                      assignedToId: managerId,
                      escalationLevel: 2,
                    },
                  });

                  await prisma.taskComment.create({
                    data: {
                      taskId: task.id,
                      userId: task.assignedTo.id,
                      content: `Auto-reassigned to ${manager.fullName} (Rule: ${rule.name})`,
                      type: 'REASSIGNMENT',
                      metadata: JSON.stringify({
                        ruleId: rule.id,
                        previousAssigneeId: task.assignedToId,
                        newAssigneeId: managerId,
                        reason: 'auto_escalation',
                      }),
                    },
                  });

                  await prisma.notification.create({
                    data: {
                      userId: managerId,
                      type: 'TASK_REASSIGNED',
                      title: 'Task auto-reassigned to you',
                      message: `Task "${task.title}" was auto-reassigned due to escalation`,
                      link: `/en/tasks/${task.id}`,
                    },
                  });

                  result.escalated++;
                  result.notified++;
                }
              }
              break;
            }
          }
        } catch (ruleError) {
          result.errors.push(`Rule ${rule.id} on task ${task.id}: ${String(ruleError)}`);
        }
      }
    }
  } catch (error) {
    result.errors.push(`Global error: ${String(error)}`);
  }

  return result;
}
