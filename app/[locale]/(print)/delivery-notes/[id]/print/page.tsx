'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';

const BRAND = '#1e40af';

interface DNItem {
  id: string;
  description: string;
  quantity: number;
  length: number | null;
  linearMeters: number | null;
  size: string | null;
  unit: string | null;
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
  client: { id: string; companyName: string } | null;
  taxInvoice: { id: string; invoiceNumber: string; lpoNumber: string | null; paymentTerms: string | null } | null;
  quotation: { id: string; quotationNumber: string } | null;
  items: DNItem[];
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

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  if (loading || !dn) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#6b7280', fontFamily: 'Arial' }}>Loading…</p>
    </div>
  );

  const deliverTo = dn.client?.companyName || dn.customer?.fullName || '—';
  const totalPcs  = dn.items.reduce((s, i) => s + i.quantity, 0);
  const totalLM   = dn.items.reduce((s, i) => s + (i.linearMeters ?? 0), 0);

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
      `}</style>

      {/* Print / Close toolbar */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, zIndex: 999, display: 'flex', gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{ background: BRAND, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          🖨 Print / Save PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          ✕ Close
        </button>
      </div>

      <div className="doc-page">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <table style={{ width: '100%', marginBottom: 16 }}>
          <tbody>
            <tr>
              {/* Left: company info */}
              <td style={{ width: '33%', verticalAlign: 'top' }}>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{COMPANY.name}</p>
                <p style={{ color: '#4b5563', fontSize: 10.5, lineHeight: 1.6, margin: 0 }}>
                  {COMPANY.address}<br />
                  Tel: {COMPANY.phone}<br />
                  {COMPANY.email}
                </p>
              </td>

              {/* Center: logo */}
              <td style={{ width: '34%', textAlign: 'center', verticalAlign: 'middle', padding: '0 8px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Logo" style={{ width: 115, height: 'auto', display: 'inline-block' }} />
              </td>

              {/* Right: DN badge + meta */}
              <td style={{ width: '33%', textAlign: 'right', verticalAlign: 'top' }}>
                <div style={{
                  display: 'inline-block', background: BRAND, color: '#fff',
                  borderRadius: 8, padding: '6px 14px', marginBottom: 6,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, margin: 0, opacity: 0.85, letterSpacing: 1 }}>DELIVERY NOTE / مذكرة تسليم</p>
                  <p style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: 1, whiteSpace: 'nowrap' }}>#{dn.dnNumber}</p>
                </div>
                <table style={{ width: '100%', fontSize: 10.5, color: '#374151' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#6b7280', paddingRight: 6 }}>Date / التاريخ</td>
                      <td style={{ fontWeight: 600 }}>{fmtDate(dn.createdAt)}</td>
                    </tr>
                    {dn.deliveredAt && (
                      <tr>
                        <td style={{ color: '#6b7280', paddingRight: 6 }}>Delivered / تاريخ التسليم</td>
                        <td style={{ fontWeight: 600 }}>{fmtDate(dn.deliveredAt)}</td>
                      </tr>
                    )}
                    {dn.taxInvoice && (
                      <tr>
                        <td style={{ color: '#6b7280', paddingRight: 6 }}>Invoice / الفاتورة</td>
                        <td style={{ fontWeight: 600 }}>{dn.taxInvoice.invoiceNumber}</td>
                      </tr>
                    )}
                    {dn.quotation && !dn.taxInvoice && (
                      <tr>
                        <td style={{ color: '#6b7280', paddingRight: 6 }}>Quotation / عرض سعر</td>
                        <td style={{ fontWeight: 600 }}>{dn.quotation.quotationNumber}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div style={{ height: 3, background: BRAND, borderRadius: 2, marginBottom: 14 }} />

        {/* ── Deliver To / Project Info ────────────────────────────────────── */}
        <table style={{ width: '100%', marginBottom: 14, fontSize: 11 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <p style={{ color: '#6b7280', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px' }}>Deliver To / تسليم إلى</p>
                <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px' }}>{deliverTo}</p>
                {dn.engineerName && <p style={{ margin: '0 0 1px', color: '#374151' }}>Eng: {dn.engineerName}</p>}
                {dn.mobileNumber && <p style={{ margin: 0, color: '#374151' }}>Tel: {dn.mobileNumber}</p>}
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <p style={{ color: '#6b7280', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 4px' }}>Project / المشروع</p>
                {dn.projectName && <p style={{ fontWeight: 600, margin: '0 0 2px' }}>{dn.projectName}</p>}
                {dn.taxInvoice?.lpoNumber    && <p style={{ margin: '0 0 1px', color: '#374151' }}>LPO: {dn.taxInvoice.lpoNumber}</p>}
                {dn.taxInvoice?.paymentTerms && <p style={{ margin: 0, color: '#374151' }}>Payment: {dn.taxInvoice.paymentTerms}</p>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Items Table ──────────────────────────────────────────────────── */}
        <table style={{ width: '100%', marginBottom: 16 }}>
          <thead>
            <tr style={{ background: BRAND, color: '#fff' }}>
              <th style={{ padding: '7px 10px', textAlign: 'left',   fontSize: 10, fontWeight: 700, border: '1px solid #1e3a8a' }}>Description / الوصف</th>
              <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, border: '1px solid #1e3a8a' }}>L/PC (cm) / الطول</th>
              <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, border: '1px solid #1e3a8a' }}>Unit / الوحدة</th>
              <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, border: '1px solid #1e3a8a' }}>Qty / الكمية</th>
              <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, border: '1px solid #1e3a8a' }}>LM / م.خ</th>
            </tr>
          </thead>
          <tbody>
            {dn.items.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontSize: 11, fontWeight: 500 }}>{item.description}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontSize: 11, textAlign: 'center', color: '#374151' }}>
                  {item.unit === 'LM' && item.length != null ? item.length.toFixed(2) : '—'}
                </td>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontSize: 11, textAlign: 'center', color: '#374151' }}>{item.unit || '—'}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontSize: 11, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #e5e7eb', fontSize: 11, textAlign: 'center', fontWeight: 600, color: BRAND }}>
                  {item.unit === 'LM' && item.linearMeters != null ? item.linearMeters.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
            {/* Summary row */}
            <tr style={{ background: '#eff6ff', fontWeight: 700 }}>
              <td colSpan={2} style={{ padding: '7px 10px', border: '1px solid #e5e7eb', textAlign: 'right', fontSize: 11, color: BRAND }}>
                Total / الإجمالي
              </td>
              <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb' }} />
              <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: 12, color: BRAND }}>{totalPcs}</td>
              <td style={{ padding: '7px 10px', border: '1px solid #e5e7eb', textAlign: 'center', fontSize: 12, color: BRAND }}>
                {totalLM > 0 ? `${totalLM.toFixed(2)} LM` : '—'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Notes ───────────────────────────────────────────────────────── */}
        {dn.notes && (
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px', marginBottom: 16 }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', margin: '0 0 3px' }}>Notes / ملاحظات</p>
            <p style={{ fontSize: 11, color: '#374151', margin: 0, whiteSpace: 'pre-line' }}>{dn.notes}</p>
          </div>
        )}

        {/* ── Signatures ──────────────────────────────────────────────────── */}
        <table style={{ width: '100%', marginTop: 24 }}>
          <tbody>
            <tr>
              <td style={{ width: '33%', textAlign: 'center', paddingTop: 32, borderTop: '1.5px solid #9ca3af', paddingRight: 12 }}>
                <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>Salesman / مندوب المبيعات</p>
                <p style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{dn.salesmanSign || <>&nbsp;</>}</p>
              </td>
              <td style={{ width: '33%', textAlign: 'center', paddingTop: 32, borderTop: '1.5px solid #9ca3af', padding: '32px 12px 0' }}>
                <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>Receiver Name / اسم المستلم</p>
                <p style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{dn.receiverName || <>&nbsp;</>}</p>
              </td>
              <td style={{ width: '33%', textAlign: 'center', paddingTop: 32, borderTop: '1.5px solid #9ca3af', paddingLeft: 12 }}>
                <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>Receiver Signature / توقيع المستلم</p>
                <p style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{dn.receiverSign || <>&nbsp;</>}</p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 9, color: '#9ca3af', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
          {COMPANY.name} · {COMPANY.address} · {COMPANY.phone}
        </div>

      </div>
    </>
  );
}
