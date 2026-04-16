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

  const fmt     = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  if (loading || !dn) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#6b7280', fontFamily: 'Arial' }}>Loading…</p>
    </div>
  );

  const deliverTo = dn.client?.companyName || dn.customer?.fullName || '—';

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
        <table style={{ width: '100%', marginBottom: 18 }}>
          <tbody><tr>
            <td style={{ verticalAlign: 'top', width: '50%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Logo" style={{ display: 'block', width: 110, height: 'auto' }} />
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{COMPANY.name}</div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{COMPANY.address}</div>
                {COMPANY.phone && <div style={{ fontSize: 10, color: '#64748b' }}>Tel: {COMPANY.phone}</div>}
              </div>
            </td>
            <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: BRAND, letterSpacing: '-0.5px', lineHeight: 1 }}>DELIVERY NOTE</div>
              <div style={{ marginTop: 10, fontSize: 12 }}>
                <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>DN No: </span><strong>{dn.dnNumber}</strong></div>
                <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>Date: </span><strong>{fmtDate(dn.createdAt)}</strong></div>
                {dn.deliveredAt && <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>Delivered: </span><strong>{fmtDate(dn.deliveredAt)}</strong></div>}
                {dn.taxInvoice  && <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>Invoice No: </span><strong>{dn.taxInvoice.invoiceNumber}</strong></div>}
                {dn.taxInvoice?.lpoNumber && <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>LPO No: </span><strong>{dn.taxInvoice.lpoNumber}</strong></div>}
                {dn.quotation   && <div><span style={{ color: '#64748b' }}>Ref. Quotation: </span><strong>{dn.quotation.quotationNumber}</strong></div>}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── DIVIDER ── */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${BRAND}, #3b82f6)`, borderRadius: 2, marginBottom: 16 }} />

        {/* ── DELIVER TO / PROJECT ── */}
        <table style={{ width: '100%', marginBottom: 16 }}>
          <tbody><tr>
            <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 12 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>DELIVER TO</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{deliverTo}</div>
                {dn.engineerName && <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>Attn: {dn.engineerName}</div>}
                {dn.mobileNumber && <div style={{ fontSize: 11, color: '#475569' }}>Tel: {dn.mobileNumber}</div>}
              </div>
            </td>
            <td style={{ width: '50%', verticalAlign: 'top' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>PROJECT DETAILS</div>
                {dn.projectName && <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{dn.projectName}</div>}
                {dn.taxInvoice?.paymentTerms && <div style={{ fontSize: 11, color: '#475569' }}>Payment Terms: {dn.taxInvoice.paymentTerms}</div>}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── ITEMS TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 11 }}>
          <thead>
            <tr style={{ background: BRAND, color: '#fff' }}>
              {['#','DESCRIPTION','SIZE','UNIT','QTY','LM','UNIT PRICE','TOTAL (AED)'].map((h, i) => (
                <th key={h} style={{ padding: '9px 7px', textAlign: i === 0 || i === 1 ? 'left' : i === 7 || i === 6 ? 'right' : 'center', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dn.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 7px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '8px 7px', fontWeight: 500 }}>{item.description}</td>
                <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>{item.size || '—'}</td>
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
        </table>

        {/* ── NOTES ── */}
        {dn.notes && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>NOTES</div>
            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{dn.notes}</div>
          </div>
        )}

        {/* ── ACKNOWLEDGEMENT ── */}
        <div style={{ marginTop: 32, marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>ACKNOWLEDGEMENT OF RECEIPT</div>
          <table style={{ width: '100%' }}>
            <tbody><tr>
              <td style={{ width: '45%', verticalAlign: 'bottom', paddingRight: 16 }}>
                <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Delivered by (Salesman)</div>
                  {dn.salesmanSign && <div style={{ fontSize: 12, fontWeight: 700 }}>{dn.salesmanSign}</div>}
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 14 }}>Signature / Name</div>
                </div>
              </td>
              <td style={{ width: '10%' }} />
              <td style={{ width: '45%', verticalAlign: 'bottom' }}>
                <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>Received by</div>
                  {dn.receiverName && <div style={{ fontSize: 12, fontWeight: 700 }}>{dn.receiverName}</div>}
                  {dn.receiverSign && <div style={{ fontSize: 11, color: '#475569' }}>{dn.receiverSign}</div>}
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 14 }}>Name / Signature / Date</div>
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
