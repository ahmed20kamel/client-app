'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Loader2 } from 'lucide-react';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const WORK_DAYS = 26;
const HOURS_PER_DAY = 8;

interface PayrollRow {
  employeeId: string;
  employee: {
    empCode: string; name: string; costCenter: string;
    wpsEntity: string; paymentMethod: string; visaType: string;
  };
  basicSalary: number; allowances: number; otherAllowance: number; totalSalary: number;
  workDays: number; absentDays: number; otHours: number; otAmount: number;
  absentDeduction: number; allowanceAdj: number; deduction: number; adjustment: number;
  grossSalary: number; wpsAmount: number; cashAmount: number; totalPayment: number;
}

const fmt = (n: number) => (n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = (arr: PayrollRow[], f: keyof PayrollRow) => arr.reduce((s, r) => s + ((r[f] as number) || 0), 0);

function PaySlip({ row, month, year }: { row: PayrollRow; month: number; year: number }) {
  const daily    = row.totalSalary / WORK_DAYS;
  const otHrRate = (row.basicSalary / WORK_DAYS / HOURS_PER_DAY) * 1.25;
  const netDays  = row.workDays || (WORK_DAYS - row.absentDays);

  return (
    <div className="pay-slip">
      {/* Company header */}
      <div className="slip-header">
        <div className="company-name">STRIDE CONSTRUCTION LLC</div>
        <div className="slip-title">SALARY SLIP</div>
        <div className="slip-period">{MONTHS[month]} {year}</div>
      </div>

      {/* Employee info */}
      <div className="info-grid">
        <div className="info-row"><span>Employee Name</span><strong>{row.employee.name}</strong></div>
        <div className="info-row"><span>Employee Code</span><strong>{row.employee.empCode}</strong></div>
        <div className="info-row"><span>Department</span><strong>{row.employee.costCenter}</strong></div>
        <div className="info-row"><span>WPS Entity</span><strong>{row.employee.wpsEntity}</strong></div>
        <div className="info-row"><span>Visa Type</span><strong>{row.employee.visaType}</strong></div>
        <div className="info-row"><span>Payment Method</span><strong>{row.employee.paymentMethod}</strong></div>
      </div>

      {/* Attendance */}
      <div className="section-label">ATTENDANCE</div>
      <div className="att-grid">
        <div className="att-cell">
          <div className="att-val">{netDays}</div>
          <div className="att-lbl">Days Worked</div>
        </div>
        <div className="att-cell red">
          <div className="att-val">{row.absentDays || 0}</div>
          <div className="att-lbl">Absent</div>
        </div>
        <div className="att-cell blue">
          <div className="att-val">{row.otHours || 0}</div>
          <div className="att-lbl">OT Hours</div>
        </div>
        <div className="att-cell gray">
          <div className="att-val">{WORK_DAYS - netDays - (row.absentDays || 0) < 0 ? 0 : WORK_DAYS - netDays - (row.absentDays || 0)}</div>
          <div className="att-lbl">Days Off</div>
        </div>
      </div>

      {/* Earnings & Deductions */}
      <div className="two-col">
        {/* Earnings */}
        <div>
          <div className="section-label green">EARNINGS</div>
          <table className="calc-table">
            <tbody>
              <tr><td>Basic Salary</td><td>{fmt(row.basicSalary)}</td></tr>
              <tr><td>Housing & Allowances</td><td>{fmt(row.allowances)}</td></tr>
              {row.otherAllowance > 0 && <tr><td>Other Allowance</td><td>{fmt(row.otherAllowance)}</td></tr>}
              {row.otHours > 0 && (
                <tr className="ot-row">
                  <td>OT ({row.otHours}h × {fmt(otHrRate)})</td>
                  <td>{fmt(row.otAmount)}</td>
                </tr>
              )}
              {row.allowanceAdj > 0 && <tr><td>Allowance Adjustment</td><td>{fmt(row.allowanceAdj)}</td></tr>}
              {row.adjustment > 0   && <tr><td>Adjustment</td><td>{fmt(row.adjustment)}</td></tr>}
            </tbody>
            <tfoot>
              <tr className="total-row"><td>Total Earnings</td><td>{fmt(row.totalSalary + row.otAmount + row.otherAllowance + row.allowanceAdj + row.adjustment)}</td></tr>
            </tfoot>
          </table>
        </div>

        {/* Deductions */}
        <div>
          <div className="section-label red">DEDUCTIONS</div>
          <table className="calc-table">
            <tbody>
              {row.absentDays > 0 && (
                <tr className="ded-row">
                  <td>Absent ({row.absentDays}d × {fmt(daily)})</td>
                  <td>({fmt(row.absentDeduction)})</td>
                </tr>
              )}
              {row.deduction > 0 && <tr className="ded-row"><td>Other Deductions</td><td>({fmt(row.deduction)})</td></tr>}
              {!row.absentDays && !row.deduction && <tr><td className="no-ded">No deductions this month</td><td>—</td></tr>}
            </tbody>
            <tfoot>
              <tr className="total-row ded-row"><td>Total Deductions</td><td>({fmt(row.absentDeduction + row.deduction)})</td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Net Salary */}
      <div className="net-section">
        <div className="net-label">NET SALARY</div>
        <div className="net-amount">{fmt(row.grossSalary)} AED</div>
      </div>

      {/* Payment breakdown */}
      <div className="pay-split">
        {row.wpsAmount > 0 && (
          <div className="pay-cell wps">
            <div className="pay-val">{fmt(row.wpsAmount)}</div>
            <div className="pay-lbl">WPS (Bank Transfer)</div>
          </div>
        )}
        {row.cashAmount > 0 && (
          <div className="pay-cell cash">
            <div className="pay-val">{fmt(row.cashAmount)}</div>
            <div className="pay-lbl">Cash</div>
          </div>
        )}
      </div>

      {/* Signature line */}
      <div className="sig-row">
        <div className="sig-box"><div className="sig-line" /><div className="sig-lbl">Employee Signature</div></div>
        <div className="sig-box"><div className="sig-line" /><div className="sig-lbl">Authorized Signature</div></div>
      </div>
    </div>
  );
}

function DeptReport({ cc, rows, month, year }: { cc: string; rows: PayrollRow[]; month: number; year: number }) {
  return (
    <div className="dept-report">
      <div className="dept-header">
        <div>
          <div className="dept-title">STRIDE CONSTRUCTION LLC — PAYROLL REPORT</div>
          <div className="dept-sub">Department: {cc} · {MONTHS[month]} {year}</div>
        </div>
        <div className="dept-count">{rows.length} Employees</div>
      </div>
      <table className="dept-table">
        <thead>
          <tr>
            <th>#</th><th>Code</th><th>Name</th><th>WPS Entity</th>
            <th>Basic</th><th>Allow.</th><th>Total Salary</th>
            <th>Work Days</th><th>Absent</th><th>OT Hrs</th><th>OT Amt</th>
            <th>Deductions</th><th>Gross</th><th>WPS</th><th>Cash</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.employeeId} className={i % 2 === 0 ? 'even' : 'odd'}>
              <td>{i + 1}</td>
              <td className="mono">{r.employee.empCode}</td>
              <td className="name-cell">{r.employee.name}</td>
              <td>{r.employee.wpsEntity}</td>
              <td className="num">{fmt(r.basicSalary)}</td>
              <td className="num">{fmt(r.allowances)}</td>
              <td className="num bold">{fmt(r.totalSalary)}</td>
              <td className="num center">{r.workDays || WORK_DAYS - r.absentDays}</td>
              <td className="num center red-t">{r.absentDays || '—'}</td>
              <td className="num center">{r.otHours || '—'}</td>
              <td className="num">{r.otAmount ? fmt(r.otAmount) : '—'}</td>
              <td className="num red-t">{r.absentDeduction ? fmt(r.absentDeduction) : '—'}</td>
              <td className="num bold">{fmt(r.grossSalary)}</td>
              <td className="num blue-t">{r.wpsAmount ? fmt(r.wpsAmount) : '—'}</td>
              <td className="num orange-t">{r.cashAmount ? fmt(r.cashAmount) : '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="total-lbl">TOTAL ({rows.length})</td>
            <td className="num bold">{fmt(sum(rows,'basicSalary'))}</td>
            <td className="num bold">{fmt(sum(rows,'allowances'))}</td>
            <td className="num bold">{fmt(sum(rows,'totalSalary'))}</td>
            <td /><td />
            <td className="num">{sum(rows,'otHours') || '—'}</td>
            <td className="num bold">{fmt(sum(rows,'otAmount'))}</td>
            <td className="num bold red-t">{fmt(sum(rows,'absentDeduction'))}</td>
            <td className="num bold">{fmt(sum(rows,'grossSalary'))}</td>
            <td className="num bold blue-t">{fmt(sum(rows,'wpsAmount'))}</td>
            <td className="num bold orange-t">{fmt(sum(rows,'cashAmount'))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function PrintPage() {
  const { period } = useParams() as { period: string };
  const [year, month] = period.split('-').map(Number);
  const [rows,    setRows]    = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res  = await fetch(`/api/payroll/monthly/${period}`);
    const { data } = await res.json();
    setRows(data?.entries || []);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const grouped: Record<string, PayrollRow[]> = {};
  for (const r of rows) {
    const cc = r.employee?.costCenter || 'Unknown';
    if (!grouped[cc]) grouped[cc] = [];
    grouped[cc].push(r);
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <Loader2 size={24} style={{ animation:'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; font-size: 11px; color: #1a1a1a; }

        /* Print button */
        .print-bar { background:#1e2d6b; color:#fff; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; }
        .print-bar h1 { font-size:14px; font-weight:600; }
        .print-btn { background:#fff; color:#1e2d6b; border:none; padding:8px 20px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; }
        .print-btn:hover { background:#e8ecff; }

        /* Page */
        .page-wrap { max-width:900px; margin:24px auto; display:flex; flex-direction:column; gap:24px; padding:0 16px 80px; }

        /* ── Pay Slip ── */
        .pay-slip { background:#fff; border:1px solid #ddd; border-radius:8px; overflow:hidden; page-break-after: always; page-break-inside: avoid; }
        .slip-header { background:#1e2d6b; color:#fff; text-align:center; padding:16px 12px 12px; }
        .company-name { font-size:13px; font-weight:700; letter-spacing:.05em; }
        .slip-title { font-size:18px; font-weight:800; margin:4px 0 2px; letter-spacing:.08em; }
        .slip-period { font-size:11px; opacity:.8; }

        .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:0; border-bottom:1px solid #eee; }
        .info-row { display:flex; justify-content:space-between; padding:6px 14px; border-bottom:1px solid #f0f0f0; font-size:11px; }
        .info-row span { color:#666; }
        .info-row strong { font-weight:600; }

        .att-grid { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid #eee; }
        .att-cell { text-align:center; padding:10px 8px; border-right:1px solid #f0f0f0; }
        .att-cell:last-child { border-right:none; }
        .att-val { font-size:20px; font-weight:700; }
        .att-lbl { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:.06em; margin-top:2px; }
        .att-cell.red .att-val { color:#dc2626; }
        .att-cell.blue .att-val { color:#1e2d6b; }
        .att-cell.gray .att-val { color:#888; }

        .section-label { font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:6px 14px 4px; background:#f8f8f8; border-bottom:1px solid #eee; border-top:1px solid #eee; color:#444; }
        .section-label.green { color:#15803d; background:#f0fdf4; border-color:#bbf7d0; }
        .section-label.red { color:#dc2626; background:#fff5f5; border-color:#fecaca; }

        .two-col { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #eee; }
        .two-col > div { border-right:1px solid #eee; }
        .two-col > div:last-child { border-right:none; }

        .calc-table { width:100%; border-collapse:collapse; }
        .calc-table td { padding:5px 14px; font-size:11px; }
        .calc-table td:last-child { text-align:right; font-weight:600; font-variant-numeric:tabular-nums; }
        .calc-table tfoot tr { border-top:2px solid #e0e0e0; background:#f9f9f9; font-weight:700; }
        .ot-row td { color:#15803d; }
        .ded-row td { color:#dc2626; }
        .no-ded { color:#aaa !important; font-style:italic; }

        .net-section { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; background:#1e2d6b; color:#fff; }
        .net-label { font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; opacity:.8; }
        .net-amount { font-size:22px; font-weight:800; font-variant-numeric:tabular-nums; }

        .pay-split { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid #eee; }
        .pay-cell { text-align:center; padding:10px; border-right:1px solid #eee; }
        .pay-cell:last-child { border-right:none; }
        .pay-val { font-size:16px; font-weight:700; font-variant-numeric:tabular-nums; }
        .pay-lbl { font-size:9px; color:#888; text-transform:uppercase; margin-top:2px; }
        .pay-cell.wps .pay-val { color:#1d4ed8; }
        .pay-cell.cash .pay-val { color:#c2410c; }

        .sig-row { display:grid; grid-template-columns:1fr 1fr; padding:16px 14px 8px; gap:24px; }
        .sig-box { text-align:center; }
        .sig-line { border-bottom:1px solid #333; height:32px; margin-bottom:4px; }
        .sig-lbl { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:.06em; }

        /* ── Dept Report ── */
        .dept-report { background:#fff; border:1px solid #ddd; border-radius:8px; overflow:hidden; page-break-inside:avoid; }
        .dept-header { background:#1e2d6b; color:#fff; display:flex; justify-content:space-between; align-items:center; padding:12px 16px; }
        .dept-title { font-size:12px; font-weight:700; }
        .dept-sub { font-size:10px; opacity:.75; margin-top:2px; }
        .dept-count { font-size:20px; font-weight:800; }

        .dept-table { width:100%; border-collapse:collapse; font-size:10px; }
        .dept-table th { background:#f3f4f6; font-weight:700; text-align:left; padding:6px 8px; border-bottom:2px solid #e0e0e0; white-space:nowrap; font-size:9px; text-transform:uppercase; letter-spacing:.04em; }
        .dept-table td { padding:5px 8px; border-bottom:1px solid #f0f0f0; }
        .dept-table tr.even { background:#fff; }
        .dept-table tr.odd { background:#f9fafb; }
        .dept-table tfoot td { background:#f3f4f6; font-weight:700; border-top:2px solid #ccc; }
        .total-lbl { font-size:10px; font-weight:700; text-transform:uppercase; color:#444; }
        .num { text-align:right; font-variant-numeric:tabular-nums; }
        .bold { font-weight:700; }
        .center { text-align:center; }
        .mono { font-family:monospace; font-weight:600; color:#1e2d6b; }
        .name-cell { max-width:140px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
        .red-t { color:#dc2626; }
        .blue-t { color:#1d4ed8; }
        .orange-t { color:#c2410c; }

        /* Print */
        @media print {
          .print-bar { display:none !important; }
          body { background:#fff; }
          .page-wrap { margin:0; padding:0; max-width:100%; gap:0; }
          .pay-slip, .dept-report { border:none; border-radius:0; margin-bottom:0; }
          .pay-slip { page-break-after:always; }
          .dept-report { page-break-before:always; }
        }
      `}</style>

      {/* Print toolbar */}
      <div className="print-bar">
        <h1>Payroll Report — {MONTHS[month]} {year} · {rows.length} Employees</h1>
        <button className="print-btn" onClick={() => window.print()}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      <div className="page-wrap">

        {/* ── Department Reports first ── */}
        {Object.entries(grouped).map(([cc, ccRows]) => (
          <DeptReport key={cc} cc={cc} rows={ccRows} month={month} year={year} />
        ))}

        {/* ── Grand Summary ── */}
        {rows.length > 0 && (
          <div className="dept-report">
            <div className="dept-header">
              <div>
                <div className="dept-title">GRAND TOTAL — ALL DEPARTMENTS</div>
                <div className="dept-sub">{MONTHS[month]} {year}</div>
              </div>
              <div className="dept-count">{rows.length} Emp</div>
            </div>
            <table className="dept-table">
              <thead>
                <tr>
                  <th>Department</th><th>Employees</th><th>Total Salary</th>
                  <th>OT Amount</th><th>Deductions</th><th>Gross</th><th>WPS</th><th>Cash</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([cc, ccRows], i) => (
                  <tr key={cc} className={i % 2 === 0 ? 'even' : 'odd'}>
                    <td className="bold">{cc}</td>
                    <td className="center">{ccRows.length}</td>
                    <td className="num bold">{fmt(sum(ccRows,'totalSalary'))}</td>
                    <td className="num">{fmt(sum(ccRows,'otAmount'))}</td>
                    <td className="num red-t">{fmt(sum(ccRows,'absentDeduction'))}</td>
                    <td className="num bold">{fmt(sum(ccRows,'grossSalary'))}</td>
                    <td className="num blue-t bold">{fmt(sum(ccRows,'wpsAmount'))}</td>
                    <td className="num orange-t bold">{fmt(sum(ccRows,'cashAmount'))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="total-lbl" colSpan={2}>TOTAL</td>
                  <td className="num bold">{fmt(sum(rows,'totalSalary'))}</td>
                  <td className="num bold">{fmt(sum(rows,'otAmount'))}</td>
                  <td className="num bold red-t">{fmt(sum(rows,'absentDeduction'))}</td>
                  <td className="num bold">{fmt(sum(rows,'grossSalary'))}</td>
                  <td className="num bold blue-t">{fmt(sum(rows,'wpsAmount'))}</td>
                  <td className="num bold orange-t">{fmt(sum(rows,'cashAmount'))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Individual Pay Slips ── */}
        {rows.map(row => (
          <PaySlip key={row.employeeId} row={row} month={month} year={year} />
        ))}

      </div>
    </>
  );
}
