'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

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
  customer: { id: string; fullName: string };
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
      .then(({ data }) => {
        setDN(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!loading && dn) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, dn]);

  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-GB');

  if (loading || !dn) {
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
                </div>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#7c3aed', letterSpacing: '-0.5px' }}>DELIVERY NOTE</div>
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  <div><span style={{ color: '#666' }}>DN No: </span><strong>{dn.dnNumber}</strong></div>
                  <div><span style={{ color: '#666' }}>Date: </span><strong>{fmtDate(dn.createdAt)}</strong></div>
                  {dn.deliveredAt && <div><span style={{ color: '#666' }}>Delivered: </span><strong>{fmtDate(dn.deliveredAt)}</strong></div>}
                  {dn.taxInvoice && <div><span style={{ color: '#666' }}>Invoice No: </span><strong>{dn.taxInvoice.invoiceNumber}</strong></div>}
                  {dn.taxInvoice?.lpoNumber && <div><span style={{ color: '#666' }}>LPO No: </span><strong>{dn.taxInvoice.lpoNumber}</strong></div>}
                  {dn.quotation && <div><span style={{ color: '#666' }}>Ref. Quotation: </span><strong>{dn.quotation.quotationNumber}</strong></div>}
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                      background: dn.status === 'DELIVERED' ? '#dcfce7' : dn.status === 'RETURNED' ? '#fee2e2' : '#ede9fe',
                      color: dn.status === 'DELIVERED' ? '#166534' : dn.status === 'RETURNED' ? '#991b1b' : '#5b21b6',
                    }}>
                      {dn.status}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ height: '3px', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: '2px', marginBottom: '20px' }} />

        {/* Delivered To */}
        <table style={{ width: '100%', marginBottom: '20px' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '16px' }}>
                <div style={{ background: '#faf5ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>DELIVER TO</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a' }}>{dn.customer.fullName}</div>
                  {dn.engineerName && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Attn: {dn.engineerName}</div>}
                  {dn.mobileNumber && <div style={{ fontSize: '12px', color: '#475569' }}>Tel: {dn.mobileNumber}</div>}
                </div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>PROJECT DETAILS</div>
                  {dn.projectName && <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1a1a1a' }}>{dn.projectName}</div>}
                  {dn.taxInvoice?.paymentTerms && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Payment Terms: {dn.taxInvoice.paymentTerms}</div>}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#7c3aed', color: 'white' }}>
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
            {dn.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#faf5ff', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '9px 8px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '9px 8px', fontWeight: '500' }}>{item.description}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{item.size || '—'}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{item.unit || '—'}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center', color: '#64748b' }}>
                  {item.unit === 'LM' && item.linearMeters ? item.linearMeters.toFixed(2) : '—'}
                </td>
                <td style={{ padding: '9px 8px', textAlign: 'right', color: '#64748b' }}>{fmt(item.unitPrice)}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Notes */}
        {dn.notes && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>NOTES</div>
            <div style={{ fontSize: '11px', color: '#475569', whiteSpace: 'pre-wrap' }}>{dn.notes}</div>
          </div>
        )}

        {/* Signature Section */}
        <div style={{ marginTop: '40px', marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '16px' }}>ACKNOWLEDGEMENT OF RECEIPT</div>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ width: '45%', verticalAlign: 'bottom', paddingRight: '16px' }}>
                  <div style={{ borderTop: '1.5px solid #94a3b8', paddingTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Delivered by (Salesman)</div>
                    {dn.salesmanSign && <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{dn.salesmanSign}</div>}
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Signature / Name</div>
                  </div>
                </td>
                <td style={{ width: '10%' }} />
                <td style={{ width: '45%', verticalAlign: 'bottom' }}>
                  <div style={{ borderTop: '1.5px solid #94a3b8', paddingTop: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Received by</div>
                    {dn.receiverName && <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{dn.receiverName}</div>}
                    {dn.receiverSign && <div style={{ fontSize: '11px', color: '#475569' }}>{dn.receiverSign}</div>}
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Name / Signature / Date</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
          <span>LitBeam Solutions LLC — Dubai, UAE</span>
          <span>{dn.dnNumber}</span>
          <span>This is a computer-generated document</span>
        </div>
      </div>
    </>
  );
}
