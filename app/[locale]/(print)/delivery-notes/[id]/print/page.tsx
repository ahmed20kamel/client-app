'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';

const BRAND       = '#1e40af';
const BRAND_LIGHT = '#dbeafe';

interface DNItem {
  id: string;
  description: string;
  quantity: number;
  length: number | null;
  linearMeters: number | null;
  size: string | null;
  unit: string | null;
  unitPrice: number;
  total: number;
}

interface DeliveryNote {
  id: string;
  dnNumber: string;
  status: string;
  engineerName: string | null;
  mobileNumber: string | null;
  projectName: string | null;
  salesmanSign: string | null;
  receiverName: string | null;
  receiverSign: string | null;
  notes: string | null;
  deliveredAt: string | null;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string; trn?: string | null; address?: string | null; phone?: string | null } | null;
  taxInvoice: { id: string; invoiceNumber: string; lpoNumber: string | null; paymentTerms: string | null } | null;
  quotation: { id: string; quotationNumber: string } | null;
  items: DNItem[];
}

function cleanDescription(description: string, size: string | null): string {
  if (!size) return description;
  const suffix = ` ${size}`;
  const base = description.endsWith(suffix) ? description.slice(0, -suffix.length) : description;
  return `${base} ${size}`;
}

export default function DeliveryNotePrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [dn, setDN] = useState<DeliveryNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/delivery-notes/${id}`)
      .then(r => r.json())
      .then(({ data }) => { setDN(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!loading && dn) setTimeout(() => window.print(), 500);
  }, [loading, dn]);

  const fmt     = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  if (loading || !dn) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#6b7280', fontFamily: 'Arial' }}>Loading…</p>
    </div>
  );

  const deliverTo   = dn.client?.companyName || dn.customer?.fullName || '—';
  const totalPieces = dn.items.reduce((s, it) => s + it.quantity, 0);
  const totalLM     = dn.items.reduce((s, it) => s + (it.linearMeters ?? 0), 0);
  const grandTotal  = dn.items.reduce((s, it) => s + it.total, 0);

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
        .ar { font-family: 'Arial', sans-serif; direction: rtl; }
        .bilabel { display: flex; flex-direction: column; gap: 1px; }
        .bilabel-en { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; }
        .bilabel-ar { font-size: 8px; color: #b0bec5; direction: rtl; }
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

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <table style={{ width: '100%', marginBottom: 14 }}>
          <tbody><tr>

            {/* Left — Company info */}
            <td style={{ verticalAlign: 'top', width: '28%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{COMPANY.name}</div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{COMPANY.address}</div>
              {COMPANY.vat   && <div style={{ fontSize: 9, color: '#64748b' }}>VAT Reg: {COMPANY.vat}</div>}
              {COMPANY.phone && <div style={{ fontSize: 9, color: '#64748b' }}>Tel: {COMPANY.phone}</div>}
            </td>

            {/* Center — Logo */}
            <td style={{ width: '37%', textAlign: 'center', verticalAlign: 'middle', padding: '0 8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Logo" style={{ width: 115, height: 'auto', display: 'inline-block' }} />
            </td>

            {/* Right — Doc title + meta */}
            <td style={{ textAlign: 'right', verticalAlign: 'top', width: '35%' }}>
              <div style={{ lineHeight: 1, marginBottom: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: BRAND, letterSpacing: '-0.5px' }}>DELIVERY NOTE</div>
                <div className="ar" style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', marginTop: 2, letterSpacing: '0.02em' }}>إشعار التسليم</div>
              </div>

              {/* DN number badge */}
              <div style={{
                background: BRAND, color: '#fff', borderRadius: 6,
                padding: '5px 10px', marginBottom: 8, display: 'inline-block',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
              }}>
                {dn.dnNumber}
              </div>

              {/* Dates / refs */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: 4 }}>
                      <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date / التاريخ</div>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{fmtDate(dn.createdAt)}</div>
                    </td>
                  </tr>
                  {dn.deliveredAt && (
                    <tr>
                      <td style={{ paddingBottom: 4 }}>
                        <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Delivered / تاريخ التسليم</div>
                        <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{fmtDate(dn.deliveredAt)}</div>
                      </td>
                    </tr>
                  )}
                  {dn.taxInvoice && (
                    <tr>
                      <td style={{ paddingBottom: 4 }}>
                        <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoice / الفاتورة</div>
                        <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{dn.taxInvoice.invoiceNumber}</div>
                      </td>
                    </tr>
                  )}
                  {dn.quotation && (
                    <tr>
                      <td>
                        <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quotation / عرض السعر</div>
                        <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{dn.quotation.quotationNumber}</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>

          </tr></tbody>
        </table>

        {/* ── DIVIDER ── */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${BRAND}, #3b82f6)`, borderRadius: 2, marginBottom: 14 }} />

        {/* ── DELIVER TO / PROJECT ── */}
        <table style={{ width: '100%', marginBottom: 14 }}>
          <tbody><tr>
            <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 10 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div className="bilabel" style={{ marginBottom: 6 }}>
                  <span className="bilabel-en">DELIVER TO</span>
                  <span className="bilabel-ar">تسليم إلى</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{deliverTo}</div>
                {dn.client?.trn     && <div style={{ fontSize: 10, color: '#475569' }}>TRN: {dn.client.trn}</div>}
                {dn.engineerName    && <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>Attn: {dn.engineerName}</div>}
                {dn.mobileNumber    && <div style={{ fontSize: 11, color: '#475569' }}>Tel: {dn.mobileNumber}</div>}
              </div>
            </td>
            <td style={{ width: '50%', verticalAlign: 'top' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div className="bilabel" style={{ marginBottom: 6 }}>
                  <span className="bilabel-en">PROJECT DETAILS</span>
                  <span className="bilabel-ar">تفاصيل المشروع</span>
                </div>
                {dn.projectName               && <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{dn.projectName}</div>}
                {dn.taxInvoice?.lpoNumber     && <div style={{ fontSize: 11, color: '#475569' }}>LPO: {dn.taxInvoice.lpoNumber}</div>}
                {dn.taxInvoice?.paymentTerms  && <div style={{ fontSize: 11, color: '#475569' }}>Payment: {dn.taxInvoice.paymentTerms}</div>}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── ITEMS TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4, fontSize: 11 }}>
          <thead>
            <tr style={{ background: BRAND, color: '#fff' }}>
              {[
                { en: '#',           ar: '#' },
                { en: 'DESCRIPTION', ar: 'الوصف' },
                { en: 'L/PC (cm)',   ar: 'الطول/قطعة' },
                { en: 'UNIT',        ar: 'الوحدة' },
                { en: 'QTY',         ar: 'الكمية' },
                { en: 'LM',          ar: 'م.خ' },
                { en: 'UNIT PRICE',  ar: 'سعر الوحدة' },
                { en: 'TOTAL (AED)', ar: 'الإجمالي' },
              ].map(({ en, ar }, i) => (
                <th key={en} style={{
                  padding: '7px 7px',
                  textAlign: i === 0 || i === 1 ? 'left' : i >= 6 ? 'right' : 'center',
                  fontWeight: 700, fontSize: 9, whiteSpace: 'nowrap',
                }}>
                  <div>{en}</div>
                  <div className="ar" style={{ fontSize: 8, fontWeight: 400, opacity: 0.85, marginTop: 1 }}>{ar}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dn.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 7px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '8px 7px', fontWeight: 500 }}>{cleanDescription(item.description, item.size)}</td>
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
            <tr style={{ background: BRAND_LIGHT, borderTop: `2px solid ${BRAND}` }}>
              <td colSpan={3} style={{ padding: '7px 9px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: BRAND }}>TOTAL SUMMARY</div>
                <div className="ar" style={{ fontSize: 9, color: '#3b82f6', marginTop: 1 }}>ملخص الإجمالي</div>
              </td>
              <td style={{ padding: '7px 7px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#64748b' }}>Unit / وحدة</div>
              </td>
              <td style={{ padding: '7px 7px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: BRAND }}>{totalPieces}</div>
                <div style={{ fontSize: 8, color: '#64748b' }}>pcs / قطعة</div>
              </td>
              <td style={{ padding: '7px 7px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: BRAND }}>{totalLM > 0 ? totalLM.toFixed(2) : '—'}</div>
                <div style={{ fontSize: 8, color: '#64748b' }}>m / متر</div>
              </td>
              <td style={{ padding: '7px 9px', textAlign: 'right' }} />
              <td style={{ padding: '7px 9px', textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: BRAND }}>{fmt(grandTotal)}</div>
                <div style={{ fontSize: 8, color: '#64748b' }}>AED</div>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── NOTES + TOTAL BOX ── */}
        <table style={{ width: '100%', marginBottom: 20, marginTop: 12 }}>
          <tbody><tr>
            <td style={{ width: '52%', verticalAlign: 'top', paddingRight: 12 }}>
              {dn.notes && (
                <div>
                  <div className="bilabel" style={{ marginBottom: 5 }}>
                    <span className="bilabel-en">NOTES</span>
                    <span className="bilabel-ar">ملاحظات</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{dn.notes}</div>
                </div>
              )}
            </td>
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Grand Total / الإجمالي الكلي</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: BRAND }}>{fmt(grandTotal)} AED</span>
                </div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── ACKNOWLEDGEMENT ── */}
        <div style={{ marginTop: 28, marginBottom: 20 }}>
          <div className="bilabel" style={{ marginBottom: 14 }}>
            <span className="bilabel-en">ACKNOWLEDGEMENT OF RECEIPT</span>
            <span className="bilabel-ar">إقرار الاستلام</span>
          </div>
          <table style={{ width: '100%' }}>
            <tbody><tr>
              <td style={{ width: '45%', verticalAlign: 'bottom', paddingRight: 16 }}>
                <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Delivered by (Salesman) / المندوب</div>
                  {dn.salesmanSign && <div style={{ fontSize: 12, fontWeight: 700 }}>{dn.salesmanSign}</div>}
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 14 }}>Signature / Name — التوقيع / الاسم</div>
                </div>
              </td>
              <td style={{ width: '10%' }} />
              <td style={{ width: '45%', verticalAlign: 'bottom' }}>
                <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Received by / المستلم</div>
                  {dn.receiverName && <div style={{ fontSize: 12, fontWeight: 700 }}>{dn.receiverName}</div>}
                  {dn.receiverSign && <div style={{ fontSize: 11, color: '#475569' }}>{dn.receiverSign}</div>}
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 14 }}>Name / Signature / Date — الاسم / التوقيع / التاريخ</div>
                </div>
              </td>
            </tr></tbody>
          </table>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8' }}>
          <span>{COMPANY.name} — {COMPANY.address}</span>
          <span>{dn.dnNumber}</span>
          <span>This is a computer-generated document</span>
        </div>

      </div>
    </>
  );
}
