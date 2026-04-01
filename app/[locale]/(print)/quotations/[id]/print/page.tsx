'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

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
  subject: string | null;
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
  customer: { id: string; fullName: string };
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
      .then(({ data }) => {
        setQuotation(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && quotation) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, quotation]);

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  if (loading || !quotation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; background: white; color: #111; margin: 0; }
        .doc-page { max-width: 210mm; margin: 0 auto; padding: 20px; background: white; min-height: 297mm; }
      `}</style>

      {/* Print / Close buttons - hidden when printing */}
      <div className="no-print fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-blue-700"
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      <div className="doc-page">
        {/* Header */}
        <table style={{ width: '100%', marginBottom: '24px' }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top' }}>
                <Image src="/logo.svg" alt="Logo" width={60} height={60} style={{ display: 'block' }} />
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>LitBeam Solutions LLC</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Dubai, UAE</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>VAT Reg: 100123456789003</div>
                </div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af', letterSpacing: '-0.5px' }}>QUOTATION</div>
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  <div><span style={{ color: '#666' }}>Quotation No: </span><strong>{quotation.quotationNumber}</strong></div>
                  <div><span style={{ color: '#666' }}>Date: </span><strong>{fmtDate(quotation.createdAt)}</strong></div>
                  {quotation.validUntil && (
                    <div><span style={{ color: '#666' }}>Valid Until: </span><strong>{fmtDate(quotation.validUntil)}</strong></div>
                  )}
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                      background: quotation.status === 'APPROVED' ? '#dcfce7' : quotation.status === 'REJECTED' ? '#fee2e2' : '#dbeafe',
                      color: quotation.status === 'APPROVED' ? '#166534' : quotation.status === 'REJECTED' ? '#991b1b' : '#1e40af',
                    }}>
                      {quotation.status}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Divider */}
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #1e40af, #3b82f6)', borderRadius: '2px', marginBottom: '20px' }} />

        {/* Bill To & Project Info */}
        <table style={{ width: '100%', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '16px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>BILL TO</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a' }}>{quotation.customer.fullName}</div>
                  {quotation.engineerName && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Attn: {quotation.engineerName}</div>}
                  {quotation.mobileNumber && <div style={{ fontSize: '12px', color: '#475569' }}>Tel: {quotation.mobileNumber}</div>}
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>PROJECT DETAILS</div>
                  {quotation.projectName && <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1a1a1a' }}>{quotation.projectName}</div>}
                  {quotation.subject && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{quotation.subject}</div>}
                  {quotation.lpoNumber && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>LPO: {quotation.lpoNumber}</div>}
                  {quotation.paymentTerms && <div style={{ fontSize: '12px', color: '#475569' }}>Payment: {quotation.paymentTerms}</div>}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#1e40af', color: 'white' }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px' }}>#</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold', fontSize: '11px' }}>DESCRIPTION</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>SIZE</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>UNIT</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>QTY</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '11px' }}>LM</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '11px' }}>UNIT PRICE</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '11px' }}>TOTAL (AED)</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '9px 8px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '9px 8px', fontWeight: '500' }}>{item.description}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{item.size || '—'}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{item.unit || '—'}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>
                  {item.unit === 'LM' && item.linearMeters ? `${item.linearMeters.toFixed(2)}` : '—'}
                </td>
                <td style={{ padding: '9px 8px', textAlign: 'right', color: '#64748b' }}>{fmt(item.unitPrice)}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <table style={{ width: '100%', marginBottom: '24px' }}>
          <tbody>
            <tr>
              <td style={{ width: '55%', verticalAlign: 'top', paddingRight: '16px' }}>
                {quotation.notes && (
                  <div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>NOTES</div>
                    <div style={{ fontSize: '11px', color: '#475569', whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
                  </div>
                )}
              </td>
              <td style={{ width: '45%', verticalAlign: 'top' }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>Subtotal</span>
                    <span style={{ fontWeight: '600' }}>{fmt(quotation.subtotal)} AED</span>
                  </div>
                  {quotation.discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Discount ({quotation.discountPercent}%)</span>
                      <span style={{ fontWeight: '600', color: '#dc2626' }}>-{fmt(quotation.discountAmount)} AED</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <span style={{ color: '#64748b' }}>VAT ({quotation.taxPercent}%)</span>
                    <span style={{ fontWeight: '600' }}>+{fmt(quotation.taxAmount)} AED</span>
                  </div>
                  {quotation.deliveryCharges > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <span style={{ color: '#64748b' }}>Delivery Charges</span>
                      <span style={{ fontWeight: '600' }}>+{fmt(quotation.deliveryCharges)} AED</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#1e40af', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold', color: 'white' }}>TOTAL</span>
                    <span style={{ fontWeight: 'bold', color: 'white' }}>{fmt(quotation.total)} AED</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Terms */}
        {quotation.terms && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>TERMS & CONDITIONS</div>
            <div style={{ fontSize: '11px', color: '#475569', whiteSpace: 'pre-wrap' }}>{quotation.terms}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', marginTop: 'auto' }}>
          <span>LitBeam Solutions LLC — Dubai, UAE</span>
          <span>{quotation.quotationNumber}</span>
          <span>This is a computer-generated document</span>
        </div>
      </div>
    </>
  );
}
