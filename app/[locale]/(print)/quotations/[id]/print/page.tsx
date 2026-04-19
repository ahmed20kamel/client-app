'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';

/* ─── Brand colour (shared across all print docs) ─── */
const BRAND = '#1e40af';

interface QuotationItem {
  id: string;
  description: string;
  quantity: number;
  length: number | null;
  linearMeters: number | null;
  size: string | null;
  unit: string | null;
  unitPrice: number;
  discount: number;
  total: number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  engineerName: string | null;
  mobileNumber: string | null;
  projectName: string | null;
  status: string;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  deliveryCharges: number;
  total: number;
  lpoNumber: string | null;
  paymentTerms: string | null;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string; trn: string | null; address: string | null; phone: string | null } | null;
  engineer: { id: string; name: string; mobile: string | null } | null;
  createdBy: { id: string; fullName: string; phone: string | null } | null;
  items: QuotationItem[];
}

export default function QuotationPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quotations/${id}`)
      .then(r => r.json())
      .then(({ data }) => { setQuotation(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!loading && quotation) setTimeout(() => window.print(), 500);
  }, [loading, quotation]);

  const fmt     = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  if (loading || !quotation) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#6b7280', fontFamily: 'Arial' }}>Loading…</p>
    </div>
  );

  const billTo = quotation.client?.companyName || quotation.customer?.fullName || '—';
  const attn   = quotation.engineer?.name || quotation.engineerName;
  const tel    = quotation.engineer?.mobile || quotation.mobileNumber;

  const totalPieces = quotation.items.reduce((s, it) => s + it.quantity, 0);
  const totalLM     = quotation.items.reduce((s, it) => s + (it.linearMeters ?? 0), 0);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; font-size: 12px; }
        .doc-page { max-width: 210mm; margin: 0 auto; padding: 14px 18px; background: #fff; }
        table { border-collapse: collapse; }
        th, td { padding: 0; }
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

        {/* ── HEADER: 3-column — Company | Logo (center) | Title ── */}
        <table style={{ width: '100%', marginBottom: 18 }}>
          <tbody><tr>
            {/* Left — Company info */}
            <td style={{ verticalAlign: 'top', width: '33%' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{COMPANY.name}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{COMPANY.address}</div>
              {COMPANY.vat   && <div style={{ fontSize: 10, color: '#64748b' }}>VAT Reg: {COMPANY.vat}</div>}
              {COMPANY.phone && <div style={{ fontSize: 10, color: '#64748b' }}>Tel: {COMPANY.phone}</div>}
            </td>
            {/* Center — Logo */}
            <td style={{ verticalAlign: 'middle', width: '34%', textAlign: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Logo" style={{ width: 110, height: 'auto' }} />
            </td>
            {/* Right — Doc title + meta */}
            <td style={{ textAlign: 'right', verticalAlign: 'top', width: '33%' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: BRAND, letterSpacing: '-0.5px', lineHeight: 1 }}>QUOTATION</div>
              <div style={{ marginTop: 10, fontSize: 12 }}>
                <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>Quotation No: </span><strong>{quotation.quotationNumber}</strong></div>
                <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>Date: </span><strong>{fmtDate(quotation.createdAt)}</strong></div>
                {quotation.validUntil && <div><span style={{ color: '#64748b' }}>Valid Until: </span><strong>{fmtDate(quotation.validUntil)}</strong></div>}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── DIVIDER ── */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${BRAND}, #3b82f6)`, borderRadius: 2, marginBottom: 16 }} />

        {/* ── BILL TO / PROJECT ── */}
        <table style={{ width: '100%', marginBottom: 16 }}>
          <tbody><tr>
            <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 12 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>BILL TO</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{billTo}</div>
                {quotation.client?.trn && <div style={{ fontSize: 10, color: '#475569' }}>TRN: {quotation.client.trn}</div>}
                {quotation.client?.address && <div style={{ fontSize: 10, color: '#475569' }}>{quotation.client.address}</div>}
                {attn && <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>Attn: {attn}</div>}
                {tel  && <div style={{ fontSize: 11, color: '#475569' }}>Tel: {tel}</div>}
              </div>
            </td>
            <td style={{ width: '50%', verticalAlign: 'top' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>PROJECT DETAILS</div>
                {quotation.projectName && <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{quotation.projectName}</div>}
                {quotation.lpoNumber   && <div style={{ fontSize: 11, color: '#475569' }}>LPO: {quotation.lpoNumber}</div>}
                {quotation.paymentTerms && <div style={{ fontSize: 11, color: '#475569' }}>Payment: {quotation.paymentTerms}</div>}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── ITEMS TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4, fontSize: 11 }}>
          <thead>
            <tr style={{ background: BRAND, color: '#fff' }}>
              {['#','DESCRIPTION','L/PC (m)','UNIT','QTY','LM','UNIT PRICE','TOTAL (AED)'].map((h, i) => (
                <th key={h} style={{ padding: '9px 7px', textAlign: i === 0 || i === 1 ? 'left' : i === 7 || i === 6 ? 'right' : 'center', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 7px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '8px 7px', fontWeight: 500 }}>{item.description}</td>
                <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>
                  {item.unit === 'LM' && item.length != null ? item.length.toFixed(2) : (item.size || '—')}
                </td>
                <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>{item.unit || '—'}</td>
                <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>
                  {item.unit === 'LM' && item.linearMeters ? item.linearMeters.toFixed(2) : '—'}
                </td>
                <td style={{ padding: '8px 7px', textAlign: 'right', color: '#64748b' }}>{fmt(item.unitPrice)}</td>
                <td style={{ padding: '8px 7px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
          {/* ── TOTALS SUMMARY ROW ── */}
          <tfoot>
            <tr style={{ background: '#dbeafe', borderTop: '2px solid #93c5fd' }}>
              <td colSpan={4} style={{ padding: '7px 7px', fontSize: 10, fontWeight: 700, color: '#1e40af', textAlign: 'left' }}>
                TOTAL SUMMARY
              </td>
              <td style={{ padding: '7px 7px', textAlign: 'center', fontWeight: 700, color: '#1e40af', fontSize: 11 }}>
                {totalPieces}
              </td>
              <td style={{ padding: '7px 7px', textAlign: 'center', fontWeight: 700, color: '#1e40af', fontSize: 11 }}>
                {totalLM > 0 ? totalLM.toFixed(2) : '—'}
              </td>
              <td style={{ padding: '7px 7px', textAlign: 'right', fontSize: 10, color: '#475569' }}>
                <span style={{ fontSize: 9, color: '#64748b' }}>Total Pieces</span>
              </td>
              <td style={{ padding: '7px 7px', textAlign: 'right', fontSize: 10, color: '#475569' }}>
                <span style={{ fontSize: 9, color: '#64748b' }}>Total LM</span>
              </td>
            </tr>
            <tr style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
              <td colSpan={4} style={{ padding: '4px 7px' }} />
              <td style={{ padding: '4px 7px', textAlign: 'center', fontSize: 9, color: '#64748b' }}>pcs</td>
              <td style={{ padding: '4px 7px', textAlign: 'center', fontSize: 9, color: '#64748b' }}>m</td>
              <td colSpan={2} style={{ padding: '4px 7px' }} />
            </tr>
          </tfoot>
        </table>

        {/* ── TOTALS + NOTES ── */}
        <table style={{ width: '100%', marginBottom: 20, marginTop: 12 }}>
          <tbody><tr>
            {/* Notes */}
            <td style={{ width: '52%', verticalAlign: 'top', paddingRight: 12 }}>
              {quotation.notes && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>NOTES</div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
                </div>
              )}
            </td>
            {/* Totals */}
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ border: `1px solid #e2e8f0`, borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                  <span style={{ color: '#64748b' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{fmt(quotation.subtotal)} AED</span>
                </div>
                {quotation.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                    <span style={{ color: '#64748b' }}>Discount ({quotation.discountPercent}%)</span>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>−{fmt(quotation.discountAmount)} AED</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                  <span style={{ color: '#64748b' }}>VAT ({quotation.taxPercent}%)</span>
                  <span style={{ fontWeight: 600 }}>+{fmt(quotation.taxAmount)} AED</span>
                </div>
                {quotation.deliveryCharges > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                    <span style={{ color: '#64748b' }}>Delivery Charges</span>
                    <span style={{ fontWeight: 600 }}>+{fmt(quotation.deliveryCharges)} AED</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 11px', background: BRAND, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>TOTAL</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{fmt(quotation.total)} AED</span>
                </div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── TERMS ── */}
        {quotation.terms && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>TERMS & CONDITIONS</div>
            <div style={{ fontSize: 10, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{quotation.terms}</div>
          </div>
        )}

        {/* ── ACCEPTANCE BLOCK ── */}
        <table style={{ width: '100%', marginBottom: 20, marginTop: 8 }}>
          <tbody><tr>
            <td style={{ width: '45%', verticalAlign: 'bottom', paddingRight: 16 }}>
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Authorized Signature</div>
                {/* Sales engineer info from the user who created the quotation */}
                {quotation.createdBy && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#111' }}>{quotation.createdBy.fullName}</div>
                    {quotation.createdBy.phone && (
                      <div style={{ fontSize: 10, color: '#475569' }}>Tel: {quotation.createdBy.phone}</div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 14 }}>Name / Title / Date</div>
              </div>
            </td>
            <td style={{ width: '10%' }} />
            <td style={{ width: '45%', verticalAlign: 'bottom' }}>
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Client Acceptance</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 18 }}>Name / Signature / Date</div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8' }}>
          <span>{COMPANY.name} — {COMPANY.address}</span>
          <span>{quotation.quotationNumber}</span>
          <span>This is a computer-generated document</span>
        </div>

      </div>
    </>
  );
}
