'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';

const BRAND       = '#1e40af';
const BRAND_LIGHT = '#dbeafe';

const BANK = {
  accountName: 'Stride International Construction & Transport-Sole Proprietorship LLC',
  bank:        'ADCB',
  accountNo:   '10550903820001',
  iban:        'AE370030010550903820001',
};

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
  discount: number;
  taxPercent: number;
  taxAmount: number;
  deliveryCharges: number;
  total: number;
  notes: string | null;
  terms: string | null;
  createdAt: string;
  customer: { id: string; fullName: string } | null;
  client: { id: string; companyName: string; trn: string | null; address: string | null; phone: string | null } | null;
  engineer: { id: string; name: string; mobile: string | null } | null;
  quotation: { id: string; quotationNumber: string } | null;
  deliveryNotes: { id: string; dnNumber: string }[];
  items: TaxInvoiceItem[];
}

/* Strip trailing size label that was appended to the description on creation */
function cleanDescription(description: string, size: string | null): string {
  if (!size) return description;
  const suffix = ` ${size}`;
  const base = description.endsWith(suffix) ? description.slice(0, -suffix.length) : description;
  return `${base} ${size}`;
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

  const billTo      = invoice.client?.companyName || invoice.customer?.fullName || '—';
  const attn        = invoice.engineer?.name || invoice.engineerName;
  const tel         = invoice.engineer?.mobile || invoice.mobileNumber;
  const totalPieces = invoice.items.reduce((s, it) => s + it.quantity, 0);
  const totalLM     = invoice.items.reduce((s, it) => s + (it.linearMeters ?? 0), 0);
  const vatReg      = invoice.ourVatReg || COMPANY.vat;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 6mm 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; font-size: 11px; }
        .doc-page { max-width: 210mm; margin: 0 auto; padding: 6px 12px; background: #fff; }
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
        <table style={{ width: '100%', marginBottom: 8 }}>
          <tbody><tr>

            {/* Left — Company info */}
            <td style={{ verticalAlign: 'top', width: '28%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{COMPANY.name}</div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{COMPANY.address}</div>
              {vatReg    && <div style={{ fontSize: 9, color: '#64748b' }}>VAT Reg: {vatReg}</div>}
              {COMPANY.phone && <div style={{ fontSize: 9, color: '#64748b' }}>Tel: {COMPANY.phone}</div>}
              {COMPANY.email && <div style={{ fontSize: 9, color: '#64748b' }}>{COMPANY.email}</div>}
            </td>

            {/* Center — Logo */}
            <td style={{ width: '37%', textAlign: 'center', verticalAlign: 'middle', padding: '0 8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Logo" style={{ width: 115, height: 'auto', display: 'inline-block' }} />
            </td>

            {/* Right — Doc title + meta */}
            <td style={{ textAlign: 'right', verticalAlign: 'top', width: '35%' }}>
              <div style={{ lineHeight: 1, marginBottom: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: BRAND, letterSpacing: '-0.5px' }}>TAX INVOICE</div>
                <div className="ar" style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', marginTop: 2, letterSpacing: '0.02em' }}>فاتورة ضريبية</div>
              </div>

              {/* Invoice number badge */}
              <div style={{
                background: BRAND, color: '#fff', borderRadius: 6,
                padding: '5px 10px', marginBottom: 8, display: 'inline-block',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {invoice.invoiceNumber}
              </div>

              {/* Date + meta — compact rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'right' }}>
                {[
                  { label: 'Date / التاريخ', value: fmtDate(invoice.createdAt) },
                  invoice.lpoNumber ? { label: 'LPO / أمر الشراء', value: invoice.lpoNumber } : null,
                  (invoice.deliveryNotes?.length > 0 || invoice.dnNumber)
                    ? { label: 'Delivery Note / مذكرة التسليم', value: invoice.deliveryNotes?.length > 0 ? invoice.deliveryNotes.map(d => d.dnNumber).join(', ') : invoice.dnNumber! }
                    : null,
                  invoice.quotation ? { label: 'Quotation Ref / رقم عرض السعر', value: invoice.quotation.quotationNumber } : null,
                ].filter(Boolean).map(row => (
                  <div key={row!.label} style={{ lineHeight: 1.2 }}>
                    <div style={{ color: '#94a3b8', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row!.label}</div>
                    <div style={{ fontWeight: 700, color: '#111', fontSize: 10.5 }}>{row!.value}</div>
                  </div>
                ))}
              </div>
            </td>

          </tr></tbody>
        </table>

        {/* ── DIVIDER ── */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${BRAND}, #3b82f6)`, borderRadius: 2, marginBottom: 8 }} />

        {/* ── BILL TO / PROJECT ── */}
        <table style={{ width: '100%', marginBottom: 8 }}>
          <tbody><tr>
            <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 10 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div className="bilabel" style={{ marginBottom: 6 }}>
                  <span className="bilabel-en">BILL TO</span>
                  <span className="bilabel-ar">فاتورة إلى</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{billTo}</div>
                {invoice.client?.trn     && <div style={{ fontSize: 10, color: '#475569' }}>TRN: {invoice.client.trn}</div>}
                {invoice.customerTrn && !invoice.client?.trn && <div style={{ fontSize: 10, color: '#475569' }}>TRN: {invoice.customerTrn}</div>}
                {invoice.client?.address && <div style={{ fontSize: 10, color: '#475569' }}>{invoice.client.address}</div>}
                {attn && <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>Attn: {attn}</div>}
                {tel  && <div style={{ fontSize: 11, color: '#475569' }}>Tel: {tel}</div>}
              </div>
            </td>
            <td style={{ width: '50%', verticalAlign: 'top' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div className="bilabel" style={{ marginBottom: 6 }}>
                  <span className="bilabel-en">PROJECT DETAILS</span>
                  <span className="bilabel-ar">تفاصيل المشروع</span>
                </div>
                {invoice.projectName   && <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{invoice.projectName}</div>}
                {invoice.paymentTerms  && <div style={{ fontSize: 11, color: '#475569' }}>Payment: {invoice.paymentTerms}</div>}
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
                { en: 'L/PC (cm)',   ar: 'الطول/قطعة (سم)' },
                { en: 'UNIT',        ar: 'الوحدة' },
                { en: 'QTY',         ar: 'الكمية' },
                { en: 'LM',          ar: 'م.خ' },
                { en: 'UNIT PRICE',  ar: 'سعر الوحدة' },
                { en: 'TOTAL (AED)', ar: 'الإجمالي' },
              ].map(({ en, ar }, i) => (
                <th key={en} style={{
                  padding: '7px 7px',
                  textAlign: i === 0 || i === 1 ? 'left' : i >= 6 ? 'right' : 'center',
                  fontWeight: 700,
                  fontSize: 9,
                  whiteSpace: 'nowrap',
                }}>
                  <div>{en}</div>
                  <div className="ar" style={{ fontSize: 8, fontWeight: 400, opacity: 0.85, marginTop: 1 }}>{ar}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 7px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '5px 7px', fontWeight: 500 }}>
                  {cleanDescription(item.description, item.size)}
                </td>
                <td style={{ padding: '5px 7px', textAlign: 'center', color: '#64748b' }}>
                  {item.unit === 'LM' && item.length != null ? item.length.toFixed(2) : (item.size || '—')}
                </td>
                <td style={{ padding: '5px 7px', textAlign: 'center', color: '#64748b' }}>{item.unit || '—'}</td>
                <td style={{ padding: '5px 7px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                <td style={{ padding: '5px 7px', textAlign: 'center', color: '#64748b' }}>
                  {item.unit === 'LM' && item.linearMeters ? item.linearMeters.toFixed(2) : '—'}
                </td>
                <td style={{ padding: '5px 7px', textAlign: 'right', color: '#64748b' }}>{fmt(item.unitPrice)}</td>
                <td style={{ padding: '5px 7px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.total)}</td>
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
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>

        {/* ── TOTALS + NOTES ── */}
        <table style={{ width: '100%', marginBottom: 8, marginTop: 6 }}>
          <tbody><tr>
            {/* Notes */}
            <td style={{ width: '52%', verticalAlign: 'top', paddingRight: 12 }}>
              {invoice.notes && (
                <div style={{ marginBottom: 10 }}>
                  <div className="bilabel" style={{ marginBottom: 5 }}>
                    <span className="bilabel-en">NOTES</span>
                    <span className="bilabel-ar">ملاحظات</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{invoice.notes}</div>
                </div>
              )}
            </td>
            {/* Totals */}
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden' }}>
                {/* Delivery */}
                {invoice.deliveryCharges > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                    <div>
                      <div style={{ color: '#64748b' }}>Delivery Charges</div>
                      <div className="ar" style={{ fontSize: 9, color: '#94a3b8' }}>رسوم التوصيل</div>
                    </div>
                    <span style={{ fontWeight: 600 }}>+{fmt(invoice.deliveryCharges)} AED</span>
                  </div>
                )}
                {/* Subtotal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                  <div>
                    <div style={{ color: '#64748b' }}>Subtotal</div>
                    <div className="ar" style={{ fontSize: 9, color: '#94a3b8' }}>المجموع الفرعي</div>
                  </div>
                  <span style={{ fontWeight: 600 }}>{fmt(invoice.subtotal)} AED</span>
                </div>
                {/* Discount */}
                {invoice.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                    <div>
                      <div style={{ color: '#16a34a' }}>Discount</div>
                      <div className="ar" style={{ fontSize: 9, color: '#86efac' }}>خصم</div>
                    </div>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>−{fmt(invoice.discount)} AED</span>
                  </div>
                )}
                {/* VAT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                  <div>
                    <div style={{ color: '#64748b' }}>VAT ({invoice.taxPercent}%)</div>
                    <div className="ar" style={{ fontSize: 9, color: '#94a3b8' }}>ضريبة القيمة المضافة</div>
                  </div>
                  <span style={{ fontWeight: 600 }}>+{fmt(invoice.taxAmount)} AED</span>
                </div>
                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', background: BRAND }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>TOTAL</div>
                    <div className="ar" style={{ fontSize: 10, color: '#bfdbfe' }}>الإجمالي</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{fmt(invoice.total)} AED</span>
                </div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── BANK ACCOUNT DETAILS ── */}
        <div style={{ border: `1px solid ${BRAND}`, borderRadius: 7, padding: '6px 12px', marginBottom: 10, background: '#f0f7ff' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 7 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bank Account Details</div>
            <div className="ar" style={{ fontSize: 9, color: '#3b82f6' }}>بيانات الحساب البنكي</div>
          </div>
          <table style={{ width: '100%', fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ color: '#64748b', paddingRight: 12, paddingBottom: 3, whiteSpace: 'nowrap', width: '30%' }}>Account Name / اسم الحساب</td>
                <td style={{ fontWeight: 600, color: '#111', paddingBottom: 3 }}>{BANK.accountName}</td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', paddingRight: 12, paddingBottom: 3, whiteSpace: 'nowrap' }}>Bank / البنك</td>
                <td style={{ fontWeight: 600, color: '#111', paddingBottom: 3 }}>{BANK.bank}</td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', paddingRight: 12, paddingBottom: 3, whiteSpace: 'nowrap' }}>Account No / رقم الحساب</td>
                <td style={{ fontWeight: 600, color: '#111', paddingBottom: 3 }}>{BANK.accountNo}</td>
              </tr>
              <tr>
                <td style={{ color: '#64748b', paddingRight: 12, whiteSpace: 'nowrap' }}>IBAN No / رقم الآيبان</td>
                <td style={{ fontWeight: 700, color: BRAND, letterSpacing: '0.05em' }}>{BANK.iban}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── ACCEPTANCE BLOCK ── */}
        <table style={{ width: '100%', marginBottom: 10 }}>
          <tbody><tr>
            <td style={{ width: '45%', verticalAlign: 'bottom', paddingRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sign.png" alt="Authorized Signature" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/stamp.png" alt="Company Stamp" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
              </div>
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Authorized Signature / التوقيع المعتمد</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>Name / Title / Date — الاسم / المسمى / التاريخ</div>
              </div>
            </td>
            <td style={{ width: '10%' }} />
            <td style={{ width: '45%', verticalAlign: 'bottom' }}>
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Client Acceptance / موافقة العميل</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 10 }}>Name / Signature / Date — الاسم / التوقيع / التاريخ</div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#94a3b8' }}>
          <span>{COMPANY.name} — {COMPANY.address}</span>
          <span>{invoice.invoiceNumber}</span>
          <span>This is a computer-generated document / وثيقة معتمدة من الحاسب الآلي</span>
        </div>

      </div>
    </>
  );
}
