'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';

const BRAND       = '#1e40af';
const BRAND_LIGHT = '#dbeafe';
const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

interface Employee {
  id: string; empCode: string; name: string; visaType: string;
  costCenter: string; wpsEntity: string; paymentMethod: string;
}
interface PayrollRow {
  employeeId: string; employee: Employee;
  basicSalary: number; allowances: number; otherAllowance: number; totalSalary: number;
  workDays: number; absentDays: number; otHours: number; otAmount: number;
  absentDeduction: number; allowanceAdj: number; deduction: number; adjustment: number;
  grossSalary: number; wpsAmount: number; cashAmount: number; otPayment: number;
  totalPayment: number; remarks?: string;
}

export default function PayrollPrintPage() {
  const { period } = useParams() as { period: string };
  const [year, month] = period.split('-').map(Number);
  const [rows,    setRows]    = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/payroll/monthly/${period}`)
      .then(r => r.json())
      .then(({ data }) => { setRows(data?.entries || []); setLoading(false); });
  }, [period]);

  useEffect(() => {
    if (!loading && rows.length > 0) setTimeout(() => window.print(), 600);
  }, [loading, rows]);

  const fmt = (n: number) => (n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const tot = (arr: PayrollRow[], f: keyof PayrollRow) => arr.reduce((s, r) => s + ((r[f] as number) || 0), 0);

  // Group by cost center
  const grouped: Record<string, PayrollRow[]> = {};
  for (const r of rows) {
    const cc = r.employee?.costCenter || 'Other';
    if (!grouped[cc]) grouped[cc] = [];
    grouped[cc].push(r);
  }

  const grandTotals = {
    wps:   tot(rows, 'wpsAmount'),
    cash:  tot(rows, 'cashAmount'),
    ot:    tot(rows, 'otPayment'),
    total: tot(rows, 'totalPayment'),
  };

  if (loading || rows.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ fontFamily: 'Arial', color: '#6b7280' }}>Loading payroll…</p>
    </div>
  );

  const TH = ({ children, right = false, bg = '' }: { children: React.ReactNode; right?: boolean; bg?: string }) => (
    <th style={{
      padding: '5px 6px', fontWeight: 700, fontSize: 8,
      textAlign: right ? 'right' : 'center', whiteSpace: 'nowrap',
      background: bg || '#f1f5f9', color: '#475569', borderRight: '1px solid #e2e8f0',
    }}>{children}</th>
  );

  const TD = ({ children, right = false, bold = false, color = '', bg = '' }: {
    children: React.ReactNode; right?: boolean; bold?: boolean; color?: string; bg?: string;
  }) => (
    <td style={{
      padding: '4px 6px', fontSize: 9, textAlign: right ? 'right' : 'left',
      fontWeight: bold ? 700 : 400, color: color || '#111',
      background: bg || 'transparent', borderRight: '1px solid #f1f5f9',
      borderBottom: '1px solid #f1f5f9',
    }}>{children}</td>
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 6mm 8mm; }
          body  { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; font-size: 9px; }
        .doc { max-width: 420mm; margin: 0 auto; padding: 6px 10px; }
        table { border-collapse: collapse; width: 100%; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ position: 'fixed', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 50 }}>
        <button onClick={() => window.print()} style={{ background: BRAND, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          Print / Save PDF
        </button>
        <button onClick={() => window.close()} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>
          Close
        </button>
      </div>

      <div className="doc">

        {/* ── TITLE HEADER ── */}
        <table style={{ marginBottom: 10 }}>
          <tbody><tr>
            <td style={{ verticalAlign: 'middle', width: '25%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{COMPANY.name}</div>
              <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{COMPANY.address}</div>
              {COMPANY.phone && <div style={{ fontSize: 8, color: '#64748b' }}>Tel: {COMPANY.phone}</div>}
            </td>
            <td style={{ textAlign: 'center', width: '50%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Logo" style={{ height: 40, width: 'auto' }} />
              <div style={{ fontSize: 16, fontWeight: 900, color: BRAND, marginTop: 4 }}>SALARY SHEET</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>كشف رواتب شهر {MONTHS[month]} {year}</div>
            </td>
            <td style={{ textAlign: 'right', verticalAlign: 'middle', width: '25%' }}>
              <div style={{ fontSize: 9, color: '#64748b' }}>Period / الفترة</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: BRAND }}>{MONTHS[month]} {year}</div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>Total Employees</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{rows.length}</div>
            </td>
          </tr></tbody>
        </table>
        <div style={{ height: 3, background: `linear-gradient(90deg,${BRAND},#3b82f6)`, borderRadius: 2, marginBottom: 10 }} />

        {/* ── COST CENTER GROUPS ── */}
        {Object.entries(grouped).map(([cc, ccRows], gi) => (
          <div key={cc} style={{ marginBottom: 14 }}>
            {/* Section header */}
            <div style={{ background: BRAND, color: '#fff', padding: '5px 10px', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cc}</span>
              <span style={{ fontSize: 9 }}>{ccRows.length} employees</span>
            </div>

            <table style={{ borderRadius: '0 0 6px 6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <TH>#</TH>
                  <TH>Code</TH>
                  <TH>Employee Name</TH>
                  <TH>VISA</TH>
                  <TH right>Basic</TH>
                  <TH right>Allow.</TH>
                  <TH right>Other</TH>
                  <TH right bg={BRAND_LIGHT}>Total Sal.</TH>
                  <TH>Work Days</TH>
                  <TH>Absent</TH>
                  <TH>OT Hrs</TH>
                  <TH right bg="#f0fdf4">OT Amt</TH>
                  <TH right bg="#fef2f2">Abs Deduct</TH>
                  <TH right>Allow Adj</TH>
                  <TH right>Deduct</TH>
                  <TH right>Adj</TH>
                  <TH right bg="#e0f2fe">GT / Gross</TH>
                  <TH right bg={BRAND_LIGHT}>WPS</TH>
                  <TH right bg="#fff7ed">Cash</TH>
                  <TH right>OT Pay</TH>
                  <TH right bg="#dcfce7">TOTAL</TH>
                  <TH>Remarks</TH>
                </tr>
              </thead>
              <tbody>
                {ccRows.map((row, i) => (
                  <tr key={row.employeeId} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <TD>{i + 1}</TD>
                    <TD><span style={{ color: BRAND, fontWeight: 700 }}>{row.employee?.empCode}</span></TD>
                    <TD bold>{row.employee?.name}</TD>
                    <TD><span style={{ color: '#64748b' }}>{row.employee?.visaType}</span></TD>
                    <TD right>{fmt(row.basicSalary)}</TD>
                    <TD right>{fmt(row.allowances)}</TD>
                    <TD right>{row.otherAllowance ? fmt(row.otherAllowance) : ''}</TD>
                    <TD right bold bg="#eff6ff">{fmt(row.totalSalary)}</TD>
                    <TD><span style={{ color: '#16a34a', fontWeight: 700 }}>{row.workDays}</span></TD>
                    <TD><span style={{ color: row.absentDays ? '#dc2626' : '#94a3b8', fontWeight: row.absentDays ? 700 : 400 }}>{row.absentDays || '—'}</span></TD>
                    <TD><span style={{ color: '#7c3aed' }}>{row.otHours || '—'}</span></TD>
                    <TD right bg="#f0fdf4"><span style={{ color: '#16a34a' }}>{row.otAmount ? fmt(row.otAmount) : ''}</span></TD>
                    <TD right bg="#fef2f2"><span style={{ color: '#dc2626' }}>{row.absentDeduction ? fmt(row.absentDeduction) : ''}</span></TD>
                    <TD right>{row.allowanceAdj ? fmt(row.allowanceAdj) : ''}</TD>
                    <TD right><span style={{ color: row.deduction ? '#dc2626' : '#94a3b8' }}>{row.deduction ? fmt(row.deduction) : ''}</span></TD>
                    <TD right><span style={{ color: (row.adjustment || 0) < 0 ? '#dc2626' : '#16a34a' }}>{row.adjustment ? fmt(row.adjustment) : ''}</span></TD>
                    <TD right bold bg="#e0f2fe">{fmt(row.grossSalary)}</TD>
                    <TD right bg="#eff6ff"><span style={{ color: BRAND, fontWeight: 600 }}>{row.wpsAmount ? fmt(row.wpsAmount) : '—'}</span></TD>
                    <TD right bg="#fff7ed"><span style={{ color: '#ea580c', fontWeight: 600 }}>{row.cashAmount ? fmt(row.cashAmount) : '—'}</span></TD>
                    <TD right>{row.otPayment ? fmt(row.otPayment) : ''}</TD>
                    <TD right bold bg="#dcfce7"><span style={{ color: '#16a34a', fontSize: 10 }}>{fmt(row.totalPayment)}</span></TD>
                    <TD><span style={{ color: '#64748b', fontSize: 8 }}>{row.remarks || ''}</span></TD>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: BRAND_LIGHT, borderTop: `2px solid ${BRAND}` }}>
                  <td colSpan={4} style={{ padding: '5px 8px', fontWeight: 800, fontSize: 9, color: BRAND, textTransform: 'uppercase' }}>
                    Subtotal — {cc}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: BRAND }}>{fmt(tot(ccRows,'basicSalary'))}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: BRAND }}>{fmt(tot(ccRows,'allowances'))}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: BRAND }}>{fmt(tot(ccRows,'otherAllowance'))}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, fontSize: 9, color: BRAND, background: BRAND_LIGHT }}>{fmt(tot(ccRows,'totalSalary'))}</td>
                  <td /><td />
                  <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, fontSize: 9, color: '#7c3aed' }}>{Math.round(tot(ccRows,'otHours') * 10) / 10 || ''}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: '#16a34a' }}>{fmt(tot(ccRows,'otAmount'))}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9, color: '#dc2626' }}>{fmt(tot(ccRows,'absentDeduction'))}</td>
                  <td /><td /><td />
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, fontSize: 9, color: BRAND, background: '#e0f2fe' }}>{fmt(tot(ccRows,'grossSalary'))}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, fontSize: 9, color: BRAND }}>{fmt(tot(ccRows,'wpsAmount'))}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 800, fontSize: 9, color: '#ea580c' }}>{fmt(tot(ccRows,'cashAmount'))}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, fontSize: 9 }}>{fmt(tot(ccRows,'otPayment'))}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 900, fontSize: 10, color: '#16a34a', background: '#dcfce7' }}>{fmt(tot(ccRows,'totalPayment'))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {/* ── GRAND TOTAL ── */}
        <div style={{ border: `2px solid ${BRAND}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, background: '#f0f9ff' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: BRAND, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Grand Total — إجمالي كشف الرواتب — {MONTHS[month]} {year}
          </div>
          <table style={{ width: 'auto' }}>
            <tbody>
              <tr>
                {[
                  { label: 'Total Employees', value: String(rows.length), color: '#111' },
                  { label: 'WPS (Bank Transfer)', value: `${fmt(grandTotals.wps)} AED`, color: BRAND },
                  { label: 'Cash Payments', value: `${fmt(grandTotals.cash)} AED`, color: '#ea580c' },
                  { label: 'OT Payments', value: `${fmt(grandTotals.ot)} AED`, color: '#7c3aed' },
                  { label: 'TOTAL PAYROLL', value: `${fmt(grandTotals.total)} AED`, color: '#16a34a' },
                ].map(({ label, value, color }) => (
                  <td key={label} style={{ padding: '6px 20px', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color, marginTop: 3 }}>{value}</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── SIGNATURES ── */}
        <table style={{ width: '100%', marginBottom: 10 }}>
          <tbody><tr>
            <td style={{ width: '30%', verticalAlign: 'bottom', paddingRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sign.png" alt="Signature" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/stamp.png" alt="Stamp" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
              </div>
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 5 }}>
                <div style={{ fontSize: 9, color: '#64748b' }}>Accounts / المحاسبة</div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 3 }}>Signature / Date</div>
              </div>
            </td>
            <td style={{ width: '5%' }} />
            <td style={{ width: '30%', verticalAlign: 'bottom', paddingRight: 16 }}>
              <div style={{ height: 48 }} />
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 5 }}>
                <div style={{ fontSize: 9, color: '#64748b' }}>HR Manager / مدير الموارد البشرية</div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 3 }}>Signature / Date</div>
              </div>
            </td>
            <td style={{ width: '5%' }} />
            <td style={{ width: '30%', verticalAlign: 'bottom' }}>
              <div style={{ height: 48 }} />
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 5 }}>
                <div style={{ fontSize: 9, color: '#64748b' }}>General Manager / المدير العام</div>
                <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 3 }}>Signature / Date</div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* Footer */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' }}>
          <span>{COMPANY.name} — {COMPANY.address}</span>
          <span>Salary Sheet — {MONTHS[month]} {year}</span>
          <span>Computer Generated / وثيقة معتمدة من الحاسب الآلي</span>
        </div>

      </div>
    </>
  );
}
