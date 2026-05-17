import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

function workingDays(year: number, month: number) {
  const total = new Date(year, month, 0).getDate();
  let c = 0;
  for (let d = 1; d <= total; d++) if (new Date(year, month - 1, d).getDay() !== 5) c++;
  return c;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Daily site log entries (day >= 300, P status) assigned to this project
    const entries = await prisma.payrollTimesheetEntry.findMany({
      where: { projectId: id, day: { gte: 300 }, dayStatus: 'P' },
      include: {
        timesheet: { select: { month: true, year: true } },
        employee: {
          select: {
            id: true, name: true, empCode: true, costCenter: true,
            totalSalary: true, basicSalary: true, allowances: true, hoursPerDay: true,
          },
        },
      },
    });

    type EmpRow = { employee: { id: string; name: string; empCode: string; costCenter: string; totalSalary: number; basicSalary: number; allowances: number; hoursPerDay: number }; days: number; hours: number; cost: number };
    type DayEmpEntry = { id: string; name: string; empCode: string; hours: number; cost: number };
    type DayRow = { calDay: number; headCount: number; totalHours: number; totalCost: number; employees: DayEmpEntry[] };
    type MonthRow = { year: number; month: number; employees: Record<string, EmpRow>; days: Record<number, DayRow> };

    const monthMap: Record<string, MonthRow> = {};

    for (const e of entries) {
      const { year, month } = e.timesheet;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { year, month, employees: {}, days: {} };

      const calDays    = new Date(year, month, 0).getDate();
      const salary     = e.employee.totalSalary || (e.employee.basicSalary + e.employee.allowances);
      const hpd        = e.employee.hoursPerDay || 8;
      const hourlyRate = calDays > 0 ? salary / calDays / hpd : 0;
      const dayRate    = hourlyRate * hours; // actual hours worked × hourly rate
      const calDay  = e.day - 300;
      const hours   = e.hours ?? 8;

      // Per-employee aggregation
      if (!monthMap[key].employees[e.employeeId]) {
        monthMap[key].employees[e.employeeId] = { employee: e.employee, days: 0, hours: 0, cost: 0 };
      }
      monthMap[key].employees[e.employeeId].days++;
      monthMap[key].employees[e.employeeId].hours += hours;
      monthMap[key].employees[e.employeeId].cost  += dayRate;

      // Per-day aggregation
      if (!monthMap[key].days[calDay]) {
        monthMap[key].days[calDay] = { calDay, headCount: 0, totalHours: 0, totalCost: 0, employees: [] };
      }
      monthMap[key].days[calDay].headCount++;
      monthMap[key].days[calDay].totalHours += hours;
      monthMap[key].days[calDay].totalCost  += dayRate;
      monthMap[key].days[calDay].employees.push({ id: e.employeeId, name: e.employee.name, empCode: e.employee.empCode, hours, cost: dayRate });
    }

    const months = Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, { year, month, employees, days }]) => {
        const empList   = Object.values(employees).sort((a, b) => b.days - a.days);
        const dailyBreakdown = Object.values(days).sort((a, b) => a.calDay - b.calDay);
        return {
          key, year, month,
          uniqueEmployees: empList.length,
          totalDays:  empList.reduce((s, e) => s + e.days,  0),
          totalHours: empList.reduce((s, e) => s + e.hours, 0),
          totalCost:  empList.reduce((s, e) => s + e.cost,  0),
          employees: empList,
          dailyBreakdown,
        };
      });

    return NextResponse.json({
      data: {
        months,
        grandTotalDays:  months.reduce((s, m) => s + m.totalDays,  0),
        grandTotalHours: months.reduce((s, m) => s + m.totalHours, 0),
        grandTotalCost:  months.reduce((s, m) => s + m.totalCost,  0),
      },
    });
  } catch (error) {
    logError('Get project manpower error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
