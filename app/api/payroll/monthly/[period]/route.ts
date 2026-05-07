import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

function parsePeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  return { year, month };
}

// Calculate payroll from timesheet entries for a given month
function calcEntry(emp: any, entries: any[]) {
  const hpd   = emp.hoursPerDay || 9;
  const days  = 30; // standard month days

  // Count from timesheet entries
  const absentDays = entries.filter(e => e.dayStatus === 'A').length;
  const sickDays   = entries.filter(e => e.dayStatus === 'SICK').length;
  const workDays   = entries.filter(e => e.dayStatus === 'P' || e.dayStatus === 'H').length;

  // OT hours = sum of (hours - hoursPerDay) where hours > hoursPerDay
  let otHours = 0;
  for (const e of entries) {
    if ((e.dayStatus === 'P' || e.dayStatus === 'H') && e.hours && e.hours > hpd) {
      otHours += e.hours - hpd;
    }
  }

  // Absent deduction: (totalSalary / 30) * absentDays
  const dailyRate      = emp.totalSalary / days;
  const absentDeduction = dailyRate * absentDays;

  // OT rate: (basicSalary / 30 / hoursPerDay) * 1.25 (overtime multiplier)
  const otRate   = (emp.basicSalary / days / hpd) * 1.25;
  const otAmount = otRate * otHours;

  const grossSalary = emp.totalSalary + emp.otherAllowance - absentDeduction + otAmount;

  // WPS vs Cash split based on paymentMethod and wpsEntity
  let wpsAmount  = 0;
  let cashAmount = 0;
  if (emp.paymentMethod === 'Cash') {
    cashAmount = grossSalary;
  } else {
    wpsAmount = emp.basicSalary - absentDeduction < 0 ? 0 : emp.basicSalary - absentDeduction;
    cashAmount = grossSalary - wpsAmount;
    if (cashAmount < 0) cashAmount = 0;
  }

  return {
    employeeId:      emp.id,
    basicSalary:     emp.basicSalary,
    allowances:      emp.allowances,
    otherAllowance:  emp.otherAllowance,
    totalSalary:     emp.totalSalary,
    workDays,
    absentDays,
    otHours:         Math.round(otHours * 100) / 100,
    otAmount:        Math.round(otAmount * 100) / 100,
    absentDeduction: Math.round(absentDeduction * 100) / 100,
    allowanceAdj:    0,
    deduction:       0,
    adjustment:      0,
    grossSalary:     Math.round(grossSalary * 100) / 100,
    wpsAmount:       Math.round(wpsAmount * 100) / 100,
    cashAmount:      Math.round(cashAmount * 100) / 100,
    otPayment:       Math.round(otAmount * 100) / 100,
    totalPayment:    Math.round(grossSalary * 100) / 100,
  };
}

// GET — fetch or compute payroll for period
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { period } = await params;
    const { year, month } = parsePeriod(period);

    // Check for saved entries
    const saved = await prisma.payrollEntry.findMany({
      where:   { month, year },
      include: { employee: true },
    });

    if (saved.length > 0) {
      return NextResponse.json({ data: { entries: saved, source: 'saved' } });
    }

    // Compute from timesheet
    const timesheet = await prisma.payrollTimesheet.findUnique({
      where:   { month_year: { month, year } },
      include: { entries: { include: { employee: true } } },
    });

    const employees = await prisma.payrollEmployee.findMany({
      where: { status: { not: 'TERMINATED' } },
    });

    const entryMap: Record<string, any[]> = {};
    if (timesheet?.entries) {
      for (const e of timesheet.entries) {
        if (!entryMap[e.employeeId]) entryMap[e.employeeId] = [];
        entryMap[e.employeeId].push(e);
      }
    }

    const computed = employees.map(emp => ({
      ...calcEntry(emp, entryMap[emp.id] || []),
      employee: emp,
    }));

    return NextResponse.json({ data: { entries: computed, source: 'computed' } });
  } catch (error) {
    logError('Get monthly payroll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — save payroll entries (with manual overrides)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { period } = await params;
    const { year, month } = parsePeriod(period);
    const { entries } = await request.json();

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: 'entries array required' }, { status: 400 });
    }

    await prisma.$transaction(
      entries.map((e: any) =>
        prisma.payrollEntry.upsert({
          where:  { month_year_employeeId: { month, year, employeeId: e.employeeId } },
          update: {
            basicSalary:     e.basicSalary,
            allowances:      e.allowances,
            otherAllowance:  e.otherAllowance,
            totalSalary:     e.totalSalary,
            workDays:        e.workDays,
            absentDays:      e.absentDays,
            otHours:         e.otHours,
            otAmount:        e.otAmount,
            absentDeduction: e.absentDeduction,
            allowanceAdj:    e.allowanceAdj    || 0,
            deduction:       e.deduction       || 0,
            adjustment:      e.adjustment      || 0,
            grossSalary:     e.grossSalary,
            wpsAmount:       e.wpsAmount,
            cashAmount:      e.cashAmount,
            otPayment:       e.otPayment,
            totalPayment:    e.totalPayment,
            remarks:         e.remarks         || null,
          },
          create: {
            month, year,
            employeeId:      e.employeeId,
            basicSalary:     e.basicSalary     || 0,
            allowances:      e.allowances      || 0,
            otherAllowance:  e.otherAllowance  || 0,
            totalSalary:     e.totalSalary     || 0,
            workDays:        e.workDays        || 0,
            absentDays:      e.absentDays      || 0,
            otHours:         e.otHours         || 0,
            otAmount:        e.otAmount        || 0,
            absentDeduction: e.absentDeduction || 0,
            allowanceAdj:    e.allowanceAdj    || 0,
            deduction:       e.deduction       || 0,
            adjustment:      e.adjustment      || 0,
            grossSalary:     e.grossSalary     || 0,
            wpsAmount:       e.wpsAmount       || 0,
            cashAmount:      e.cashAmount      || 0,
            otPayment:       e.otPayment       || 0,
            totalPayment:    e.totalPayment    || 0,
            remarks:         e.remarks         || null,
          },
        })
      )
    );

    return NextResponse.json({ message: 'Payroll saved', count: entries.length });
  } catch (error) {
    logError('Save payroll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
