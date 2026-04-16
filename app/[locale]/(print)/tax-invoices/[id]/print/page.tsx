'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';

const BRAND = '#1e40af';

interface TaxInvoiceItem {
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

interface TaxInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  engineerName: string | null;
  mobileNumber: string | null;
  projectName: string | null;
  customerTrn: string | null;
  ourVatReg: string | null;
  dnNumber: string | null;
  lpoNumber: string | null;
  paymentTerms: string | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  deliveryCharges: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  terms: string | null;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string; trn: string | null } | null;
  quotation: { id: string; quotationNumber: string } | null;
  deliveryNotes: { id: string; dnNumber: string }[];
  items: TaxInvoiceItem[];
}

export default function TaxInvoicePrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<TaxInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tax-invoices/${id}`)
      .then(r => r.json())
      .then(({ data }) => { setInvoice(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!loading && invoice) setTimeout(() => window.print(), 500);
  }, [loading, invoice]);

  const fmt     = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  if (loading || !invoice) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p style={{ color: '#6b7280', fontFamily: 'Arial' }}>Loading…</p>
    </div>
  );

  const billTo   = invoice.client?.companyName || invoice.customer?.fullName || '—';
  const clientTrn = invoice.client?.trn || invoice.customerTrn;
  const balance  = invoice.total - (invoice.paidAmount ?? 0);

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
                {(invoice.ourVatReg || COMPANY.vat) && <div style={{ fontSize: 10, color: '#64748b' }}>VAT Reg: {invoice.ourVatReg || COMPANY.vat}</div>}
                {COMPANY.phone && <div style={{ fontSize: 10, color: '#64748b' }}>Tel: {COMPANY.phone}</div>}
              </div>
            </td>
            <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: BRAND, letterSpacing: '-0.5px', lineHeight: 1 }}>TAX INVOICE</div>
              <div style={{ marginTop: 10, fontSize: 12 }}>
                <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>Invoice No: </span><strong>{invoice.invoiceNumber}</strong></div>
                <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>Date: </span><strong>{fmtDate(invoice.createdAt)}</strong></div>
                {invoice.lpoNumber  && <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>LPO No: </span><strong>{invoice.lpoNumber}</strong></div>}
                {invoice.deliveryNotes?.length > 0 && <div style={{ marginBottom: 2 }}><span style={{ color: '#64748b' }}>DN No: </span><strong>{invoice.deliveryNotes.map(d => d.dnNumber).join(', ')}</strong></div>}
                {invoice.quotation  && <div><span style={{ color: '#64748b' }}>Ref. Quotation: </span><strong>{invoice.quotation.quotationNumber}</strong></div>}
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
                {clientTrn        && <div style={{ fontSize: 10, color: '#475569' }}>TRN: {clientTrn}</div>}
                {invoice.engineerName && <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>Attn: {invoice.engineerName}</div>}
                {invoice.mobileNumber && <div style={{ fontSize: 11, color: '#475569' }}>Tel: {invoice.mobileNumber}</div>}
              </div>
            </td>
            <td style={{ width: '50%', verticalAlign: 'top' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>PROJECT DETAILS</div>
                {invoice.projectName  && <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{invoice.projectName}</div>}
                {invoice.paymentTerms && <div style={{ fontSize: 11, color: '#475569' }}>Payment Terms: {invoice.paymentTerms}</div>}
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
            {invoice.items.map((item, i) => (
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

        {/* ── TOTALS + NOTES ── */}
        <table style={{ width: '100%', marginBottom: 20 }}>
          <tbody><tr>
            <td style={{ width: '52%', verticalAlign: 'top', paddingRight: 12 }}>
              {invoice.notes && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>NOTES</div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{invoice.notes}</div>
                </div>
              )}
            </td>
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                  <span style={{ color: '#64748b' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{fmt(invoice.subtotal)} AED</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                  <span style={{ color: '#64748b' }}>VAT ({invoice.taxPercent}%)</span>
                  <span style={{ fontWeight: 600 }}>+{fmt(invoice.taxAmount)} AED</span>
                </div>
                {invoice.deliveryCharges > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                    <span style={{ color: '#64748b' }}>Delivery Charges</span>
                    <span style={{ fontWeight: 600 }}>+{fmt(invoice.deliveryCharges)} AED</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 11px', background: BRAND, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>TOTAL</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{fmt(invoice.total)} AED</span>
                </div>
                {/* Payment summary — only shown when partially/fully paid */}
                {(invoice.paidAmount ?? 0) > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', borderTop: '1px solid #e2e8f0', fontSize: 11 }}>
                      <span style={{ color: '#64748b' }}>Amount Paid</span>
                      <span style={{ fontWeight: 600, color: '#059669' }}>{fmt(invoice.paidAmount)} AED</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', fontSize: 11 }}>
                      <span style={{ color: '#64748b' }}>Balance Due</span>
                      <span style={{ fontWeight: 700, color: balance > 0.01 ? '#dc2626' : '#059669' }}>{fmt(balance)} AED</span>
                    </div>
                  </>
                )}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── TERMS ── */}
        {invoice.terms && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>TERMS & CONDITIONS</div>
            <div style={{ fontSize: 10, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{invoice.terms}</div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8' }}>
          <span>{COMPANY.name} — {COMPANY.address}</span>
          <span>{invoice.invoiceNumber}</span>
          <span>This is a computer-generated document</span>
        </div>

      </div>
    </>
  );
}
