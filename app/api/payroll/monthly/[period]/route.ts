import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError } from '@/lib/logger';

function parsePeriod(period: string) {
  const [year, month] = period.split('-').map(Number);
  return { year, month };
}

// Count working days in a month (Mon–Thu + Sat, i.e. Friday = day off)
function getWorkingDays(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 5) count++; // 5 = Friday
  }
  return count;
}

// Calculate payroll from timesheet entries for a given month
function calcEntry(emp: any, entries: any[], year: number, month: number, loanDeduction = 0) {
  const hpd      = 8;
  const workDays = getWorkingDays(year, month);

  // Count from timesheet entries
  const absentDays  = entries.filter(e => e.dayStatus === 'A').length;
  const presentDays = entries.filter(e => e.dayStatus === 'P' || e.dayStatus === 'H').length;
  const netWorkDays = presentDays || Math.max(0, workDays - absentDays);

  // OT hours = sum of (hours - 8) where hours > 8
  let otHours = 0;
  for (const e of entries) {
    if ((e.dayStatus === 'P' || e.dayStatus === 'H') && e.hours && e.hours > hpd) {
      otHours += e.hours - hpd;
    }
  }

  // Absent deduction: (totalSalary / workDays) × absentDays
  const dailyRate       = emp.totalSalary / workDays;
  const absentDeduction = dailyRate * absentDays;

  const otHourlyRate = emp.basicSalary / workDays / hpd;
  const otAmount     = otHourlyRate * otHours;

  const grossSalary  = emp.totalSalary + emp.otherAllowance - absentDeduction + otAmount;
  const netPayable   = grossSalary - loanDeduction;

  // WPS vs Cash split based on paymentMethod and wpsEntity
  let wpsAmount  = 0;
  let cashAmount = 0;
  if (emp.paymentMethod === 'Cash') {
    cashAmount = netPayable;
  } else {
    wpsAmount = emp.basicSalary - absentDeduction < 0 ? 0 : emp.basicSalary - absentDeduction;
    cashAmount = netPayable - wpsAmount;
    if (cashAmount < 0) cashAmount = 0;
  }

  return {
    employeeId:      emp.id,
    basicSalary:     emp.basicSalary,
    allowances:      emp.allowances,
    otherAllowance:  emp.otherAllowance,
    totalSalary:     emp.totalSalary,
    workDays:        netWorkDays,
    absentDays,
    otHours:         Math.round(otHours * 100) / 100,
    otAmount:        Math.round(otAmount * 100) / 100,
    absentDeduction: Math.round(absentDeduction * 100) / 100,
    allowanceAdj:    0,
    deduction:       0,
    loanDeduction:   Math.round(loanDeduction * 100) / 100,
    adjustment:      0,
    grossSalary:     Math.round(grossSalary * 100) / 100,
    wpsAmount:       Math.round(wpsAmount * 100) / 100,
    cashAmount:      Math.round(cashAmount * 100) / 100,
    otPayment:       Math.round(otAmount * 100) / 100,
    totalPayment:    Math.round(netPayable * 100) / 100,
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

    // Active loans for this period
    const activeLoans = await prisma.payrollLoan.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { startYear: { lt: year } },
          { startYear: year, startMonth: { lte: month } },
        ],
      },
    });

    // Build map: employeeId → total installment this month
    const loanMap: Record<string, number> = {};
    for (const loan of activeLoans) {
      const remaining = loan.totalAmount - loan.paidAmount;
      if (remaining <= 0) continue;
      const installment = Math.min(loan.installmentAmount, remaining);
      loanMap[loan.employeeId] = (loanMap[loan.employeeId] || 0) + installment;
    }

    const entryMap: Record<string, any[]> = {};
    if (timesheet?.entries) {
      for (const e of timesheet.entries) {
        if (!entryMap[e.employeeId]) entryMap[e.employeeId] = [];
        entryMap[e.employeeId].push(e);
      }
    }

    const computed = employees.map(emp => ({
      ...calcEntry(emp, entryMap[emp.id] || [], year, month, loanMap[emp.id] || 0),
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

    // Fetch active loans for employees being saved
    const employeeIds = entries.map((e: any) => e.employeeId);
    const activeLoans = await prisma.payrollLoan.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'ACTIVE',
        OR: [
          { startYear: { lt: year } },
          { startYear: year, startMonth: { lte: month } },
        ],
      },
    });

    // Group loans by employee
    const loansByEmp: Record<string, typeof activeLoans> = {};
    for (const loan of activeLoans) {
      if (!loansByEmp[loan.employeeId]) loansByEmp[loan.employeeId] = [];
      loansByEmp[loan.employeeId].push(loan);
    }

    await prisma.$transaction(async (tx) => {
      for (const e of entries) {
        await tx.payrollEntry.upsert({
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
            loanDeduction:   e.loanDeduction   || 0,
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
            loanDeduction:   e.loanDeduction   || 0,
            adjustment:      e.adjustment      || 0,
            grossSalary:     e.grossSalary     || 0,
            wpsAmount:       e.wpsAmount       || 0,
            cashAmount:      e.cashAmount      || 0,
            otPayment:       e.otPayment       || 0,
            totalPayment:    e.totalPayment    || 0,
            remarks:         e.remarks         || null,
          },
        });

        // Record loan deductions for this employee
        const empLoans = loansByEmp[e.employeeId] || [];
        for (const loan of empLoans) {
          const remaining   = loan.totalAmount - loan.paidAmount;
          if (remaining <= 0) continue;
          const deducted = Math.min(loan.installmentAmount, remaining);
          // Upsert deduction record
          await tx.payrollLoanDeduction.upsert({
            where:  { loanId_month_year: { loanId: loan.id, month, year } },
            update: { amount: deducted },
            create: { loanId: loan.id, employeeId: e.employeeId, month, year, amount: deducted },
          });
          // Update loan paidAmount
          const newPaid = loan.paidAmount + deducted;
          const newStatus = newPaid >= loan.totalAmount ? 'COMPLETED' : 'ACTIVE';
          await tx.payrollLoan.update({
            where:  { id: loan.id },
            data:   { paidAmount: newPaid, status: newStatus },
          });
        }
      }
    });

    return NextResponse.json({ message: 'Payroll saved', count: entries.length });
  } catch (error) {
    logError('Save payroll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
