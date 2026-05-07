'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';

const BRAND       = '#1e40af';
const BRAND_LIGHT = '#dbeafe';

interface ReportRow {
  id: string;
  invoiceNumber: string;
  date: string;
  company: string;
  amount: number;
  vat: number;
  deliveryCharges: number;
  total: number;
}
interface ReportData {
  rows: ReportRow[];
  totals: { amount: number; vat: number; deliveryCharges: number; total: number };
  earnedBonus: number;
  bonusPct: number;
}

export default function SalesBonusPrintPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const from      = searchParams.get('from') || '';
  const to        = searchParams.get('to') || '';
  const product   = searchParams.get('product') || '';
  const bonusPct  = searchParams.get('bonusPct') || '4';

  useEffect(() => {
    const params = new URLSearchParams();
    if (from)     params.set('from', from);
    if (to)       params.set('to', to);
    if (product)  params.set('product', product);
    if (bonusPct) params.set('bonusPct', bonusPct);
    fetch(`/api/reports/sales-bonus?${params}`)
      .then(r => r.json())
      .then(({ data }) => { setData(data); setLoading(false); });
  }, [from, to, product, bonusPct]);

  useEffect(() => {
    if (!loading && data) setTimeout(() => window.print(), 500);
  }, [loading, data]);

  const fmt     = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  const periodLabel = from || to
    ? [from ? fmtDate(from) : 'Start', to ? fmtDate(to) : 'End'].join(' — ')
    : 'All Dates';

  if (loading || !data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#6b7280', fontFamily: 'Arial' }}>Loading…</p>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; font-size: 11px; }
        .doc-page { max-width: 277mm; margin: 0 auto; padding: 8px 14px; background: #fff; }
        table { border-collapse: collapse; }
        th, td { padding: 0; }
        .ar { font-family: 'Arial', sans-serif; direction: rtl; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 50 }}>
        <button onClick={() => window.print()} style={{ background: BRAND, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Print / Save PDF
        </button>
        <button onClick={() => window.close()} style={{ background: '#e5e7eb', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          Close
        </button>
      </div>

      <div className="doc-page">

        {/* ── HEADER ── */}
        <table style={{ width: '100%', marginBottom: 10 }}>
          <tbody><tr>
            {/* Left — Company */}
            <td style={{ verticalAlign: 'top', width: '28%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{COMPANY.name}</div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{COMPANY.address}</div>
              {COMPANY.phone && <div style={{ fontSize: 9, color: '#64748b' }}>Tel: {COMPANY.phone}</div>}
              {COMPANY.email && <div style={{ fontSize: 9, color: '#64748b' }}>{COMPANY.email}</div>}
            </td>

            {/* Center — Logo */}
            <td style={{ width: '37%', textAlign: 'center', verticalAlign: 'middle', padding: '0 8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Logo" style={{ width: 110, height: 'auto', display: 'inline-block' }} />
            </td>

            {/* Right — Title */}
            <td style={{ textAlign: 'right', verticalAlign: 'top', width: '35%' }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: BRAND, letterSpacing: '-0.5px' }}>SALES BONUS REPORT</div>
                <div className="ar" style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', marginTop: 2 }}>تقرير مكافأة المبيعات</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: 4 }}>
                      <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Period / الفترة</div>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{periodLabel}</div>
                    </td>
                  </tr>
                  {product && (
                    <tr>
                      <td style={{ paddingBottom: 4 }}>
                        <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Product Filter / المنتج</div>
                        <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{product}</div>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>
                      <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bonus Rate / نسبة المكافأة</div>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{bonusPct}%</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr></tbody>
        </table>

        {/* ── DIVIDER ── */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${BRAND}, #3b82f6)`, borderRadius: 2, marginBottom: 10 }} />

        {/* ── DATA TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 10 }}>
          <thead>
            <tr style={{ background: BRAND, color: '#fff' }}>
              {[
                { label: '#',              align: 'left'  as const },
                { label: 'Date',           align: 'left'  as const },
                { label: 'Company',        align: 'left'  as const },
                { label: 'Tax Invoice',    align: 'left'  as const },
                { label: 'Amount (AED)',   align: 'right' as const },
                { label: 'VAT (AED)',      align: 'right' as const },
                { label: 'Delivery (AED)', align: 'right' as const },
                { label: 'Total (AED)',    align: 'right' as const },
              ].map(({ label, align }) => (
                <th key={label} style={{ padding: '7px 8px', textAlign: align, fontWeight: 700, fontSize: 9, whiteSpace: 'nowrap' }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 8px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '5px 8px' }}>{fmtDate(row.date)}</td>
                <td style={{ padding: '5px 8px', fontWeight: 500 }}>{row.company}</td>
                <td style={{ padding: '5px 8px', color: BRAND, fontWeight: 600 }}>{row.invoiceNumber}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmt(row.amount)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#64748b' }}>{fmt(row.vat)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: '#64748b' }}>{fmt(row.deliveryCharges)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>{fmt(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: BRAND_LIGHT, borderTop: `2px solid ${BRAND}` }}>
              <td colSpan={4} style={{ padding: '7px 8px', fontWeight: 700, color: BRAND, fontSize: 10, textTransform: 'uppercase' }}>
                TOTAL — الإجمالي
              </td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: BRAND }}>{fmt(data.totals.amount)}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: BRAND }}>{fmt(data.totals.vat)}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: BRAND }}>{fmt(data.totals.deliveryCharges)}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: BRAND }}>{fmt(data.totals.total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* ── EARNED BONUS SUMMARY ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 18 }}>
          <div style={{ border: '2px solid #059669', borderRadius: 10, padding: '12px 20px', background: '#f0fdf4', display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Total Amount</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{fmt(data.totals.amount)} AED</div>
            </div>
            <div style={{ fontSize: 18, color: '#94a3b8' }}>×</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Bonus Rate</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{data.bonusPct}%</div>
            </div>
            <div style={{ fontSize: 18, color: '#94a3b8' }}>=</div>
            <div style={{ background: '#059669', borderRadius: 8, padding: '8px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#d1fae5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>Earned Bonus / المكافأة المستحقة</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{fmt(data.earnedBonus)} AED</div>
            </div>
          </div>
        </div>

        {/* ── SIGNATURES ── */}
        <table style={{ width: '100%', marginBottom: 10 }}>
          <tbody><tr>
            {/* Authorized Signature */}
            <td style={{ width: '30%', verticalAlign: 'bottom', paddingRight: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sign.png" alt="Authorized Signature" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/stamp.png" alt="Company Stamp" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
              </div>
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Authorized Signature / التوقيع المعتمد</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>Accounts — المحاسبة</div>
              </div>
            </td>

            <td style={{ width: '5%' }} />

            {/* Manager Signature */}
            <td style={{ width: '30%', verticalAlign: 'bottom', paddingRight: 12 }}>
              <div style={{ height: 52 }} />
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Manager Signature / توقيع المدير</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>Name / Date — الاسم / التاريخ</div>
              </div>
            </td>

            <td style={{ width: '5%' }} />

            {/* Salesman Signature */}
            <td style={{ width: '30%', verticalAlign: 'bottom' }}>
              <div style={{ height: 52 }} />
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Salesman Signature / توقيع البائع</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>Name / Date — الاسم / التاريخ</div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#94a3b8' }}>
          <span>{COMPANY.name} — {COMPANY.address}</span>
          <span>Sales Bonus Report{product ? ` — ${product}` : ''}</span>
          <span>This is a computer-generated document / وثيقة معتمدة من الحاسب الآلي</span>
        </div>

      </div>
    </>
  );
}
