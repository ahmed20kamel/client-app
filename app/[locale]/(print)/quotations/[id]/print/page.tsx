'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { COMPANY } from '@/lib/company';

const BRAND       = '#1e40af';
const BRAND_LIGHT = '#dbeafe';

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
  product: { unitOfMeasure: string; category: { name: string } | null } | null;
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

/* Strip trailing size label that was appended to the description on creation */
function cleanDescription(description: string, size: string | null): string {
  if (!size) return description;
  const suffix = ` ${size}`;
  const base = description.endsWith(suffix) ? description.slice(0, -suffix.length) : description;
  return `${base} ${size}`;
}

export default function QuotationPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading]     = useState(true);

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

  const billTo      = quotation.client?.companyName || quotation.customer?.fullName || '—';
  const attn        = quotation.engineer?.name || quotation.engineerName;
  const tel         = quotation.engineer?.mobile || quotation.mobileNumber;
  const totalPieces = quotation.items.reduce((s, it) => s + it.quantity, 0);
  const totalLM     = quotation.items.reduce((s, it) => s + (it.linearMeters ?? 0), 0);
  const isLitPAD   = (it: QuotationItem) =>
    it.product?.unitOfMeasure === 'PIECE' ||
    it.product?.category?.name === 'LitPAD' ||
    /litpad/i.test(it.description);
  const hasLmItems  = quotation.items.some(it => !isLitPAD(it));

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

            {/* Left — Company info (English) */}
            <td style={{ verticalAlign: 'top', width: '28%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>{COMPANY.name}</div>
              <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{COMPANY.address}</div>
              {COMPANY.vat   && <div style={{ fontSize: 9, color: '#64748b' }}>VAT Reg: {COMPANY.vat}</div>}
              {COMPANY.phone && <div style={{ fontSize: 9, color: '#64748b' }}>Tel: {COMPANY.phone}</div>}
            </td>

            {/* Center — Logo (perfectly centered) */}
            <td style={{ width: '37%', textAlign: 'center', verticalAlign: 'middle', padding: '0 8px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Logo" style={{ width: 115, height: 'auto', display: 'inline-block' }} />
            </td>

            {/* Right — Doc title + meta (Arabic + English) */}
            <td style={{ textAlign: 'right', verticalAlign: 'top', width: '35%' }}>
              {/* Bilingual title */}
              <div style={{ lineHeight: 1, marginBottom: 10 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: BRAND, letterSpacing: '-0.5px' }}>QUOTATION</div>
                <div className="ar" style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', marginTop: 2, letterSpacing: '0.02em' }}>عرض سعر</div>
              </div>

              {/* Quotation number — prominent badge */}
              <div style={{
                background: BRAND, color: '#fff', borderRadius: 6,
                padding: '5px 10px', marginBottom: 8, display: 'inline-block',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {quotation.quotationNumber}
              </div>

              {/* Dates — stacked label / value */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <tbody>
                  <tr>
                    <td style={{ paddingBottom: 5, paddingRight: 6 }}>
                      <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date / التاريخ</div>
                      <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{fmtDate(quotation.createdAt)}</div>
                    </td>
                    {quotation.validUntil && (
                      <td style={{ paddingBottom: 5, textAlign: 'right' }}>
                        <div style={{ color: '#94a3b8', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valid Until / صالح حتى</div>
                        <div style={{ fontWeight: 700, color: '#111', fontSize: 11 }}>{fmtDate(quotation.validUntil)}</div>
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </td>

          </tr></tbody>
        </table>

        {/* ── DIVIDER ── */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${BRAND}, #3b82f6)`, borderRadius: 2, marginBottom: 14 }} />

        {/* ── BILL TO / PROJECT ── */}
        <table style={{ width: '100%', marginBottom: 14 }}>
          <tbody><tr>
            <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 10 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '10px 12px' }}>
                <div className="bilabel" style={{ marginBottom: 6 }}>
                  <span className="bilabel-en">BILL TO</span>
                  <span className="bilabel-ar">فاتورة إلى</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{billTo}</div>
                {quotation.client?.trn     && <div style={{ fontSize: 10, color: '#475569' }}>TRN: {quotation.client.trn}</div>}
                {quotation.client?.address && <div style={{ fontSize: 10, color: '#475569' }}>{quotation.client.address}</div>}
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
                {quotation.projectName  && <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 3 }}>{quotation.projectName}</div>}
                {quotation.lpoNumber    && <div style={{ fontSize: 11, color: '#475569' }}>LPO: {quotation.lpoNumber}</div>}
                {quotation.paymentTerms && <div style={{ fontSize: 11, color: '#475569' }}>Payment: {quotation.paymentTerms}</div>}
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── ITEMS TABLE ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4, fontSize: 11 }}>
          <thead>
            <tr style={{ background: BRAND, color: '#fff' }}>
              {[
                { en: '#',           ar: '#',                  show: true },
                { en: 'DESCRIPTION', ar: 'الوصف',              show: true },
                { en: 'L/PC (cm)',   ar: 'الطول/قطعة (سم)',    show: hasLmItems },
                { en: 'UNIT',        ar: 'الوحدة',             show: true },
                { en: 'QTY',         ar: 'الكمية',             show: true },
                { en: 'LM',          ar: 'م.خ',                show: hasLmItems },
                { en: 'UNIT PRICE',  ar: 'سعر الوحدة',         show: true },
                { en: 'TOTAL (AED)', ar: 'الإجمالي',           show: true },
              ].filter(c => c.show).map(({ en, ar }, i, arr) => (
                <th key={en} style={{
                  padding: '7px 7px',
                  textAlign: i === 0 || i === 1 ? 'left' : i >= arr.length - 2 ? 'right' : 'center',
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
            {quotation.items.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 7px', color: '#64748b' }}>{i + 1}</td>
                <td style={{ padding: '8px 7px', fontWeight: 500 }}>
                  {cleanDescription(item.description, item.size)}
                </td>
                {hasLmItems && (
                  <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>
                    {item.unit === 'LM' && item.length != null ? item.length.toFixed(2) : (item.size || '—')}
                  </td>
                )}
                <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>{isLitPAD(item) ? 'pc' : (item.unit || 'pc')}</td>
                <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                {hasLmItems && (
                  <td style={{ padding: '8px 7px', textAlign: 'center', color: '#64748b' }}>
                    {item.unit === 'LM' && item.linearMeters ? item.linearMeters.toFixed(2) : '—'}
                  </td>
                )}
                <td style={{ padding: '8px 7px', textAlign: 'right', color: '#64748b' }}>{fmt(item.unitPrice)}</td>
                <td style={{ padding: '8px 7px', textAlign: 'right', fontWeight: 700 }}>{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>

          {/* ── TOTALS SUMMARY ROW ── */}
          <tfoot>
            <tr style={{ background: BRAND_LIGHT, borderTop: `2px solid ${BRAND}` }}>
              <td colSpan={hasLmItems ? 3 : 2} style={{ padding: '7px 9px' }}>
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
              {hasLmItems && (
                <td style={{ padding: '7px 7px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: BRAND }}>{totalLM > 0 ? totalLM.toFixed(2) : '—'}</div>
                  <div style={{ fontSize: 8, color: '#64748b' }}>m / متر</div>
                </td>
              )}
              <td colSpan={2} />
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
                  <div className="bilabel" style={{ marginBottom: 5 }}>
                    <span className="bilabel-en">NOTES</span>
                    <span className="bilabel-ar">ملاحظات</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{quotation.notes}</div>
                </div>
              )}
            </td>
            {/* Totals */}
            <td style={{ width: '48%', verticalAlign: 'top' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 7, overflow: 'hidden' }}>
                {/* Subtotal (items only) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                  <div>
                    <div style={{ color: '#64748b' }}>Subtotal</div>
                    <div className="ar" style={{ fontSize: 9, color: '#94a3b8' }}>المجموع الفرعي</div>
                  </div>
                  <span style={{ fontWeight: 600 }}>{fmt(quotation.subtotal)} AED</span>
                </div>
                {/* Delivery */}
                {quotation.deliveryCharges > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                    <div>
                      <div style={{ color: '#64748b' }}>Delivery Charges</div>
                      <div className="ar" style={{ fontSize: 9, color: '#94a3b8' }}>رسوم التوصيل</div>
                    </div>
                    <span style={{ fontWeight: 600 }}>+{fmt(quotation.deliveryCharges)} AED</span>
                  </div>
                )}
                {/* Subtotal + Delivery combined line */}
                {quotation.deliveryCharges > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11, background: '#f8fafc' }}>
                    <div style={{ color: '#94a3b8', fontSize: 9 }}></div>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{fmt(quotation.subtotal + quotation.deliveryCharges)} AED</span>
                  </div>
                )}
                {/* Discount */}
                {quotation.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                    <div>
                      <div style={{ color: '#64748b' }}>Discount ({quotation.discountPercent}%)</div>
                      <div className="ar" style={{ fontSize: 9, color: '#94a3b8' }}>خصم</div>
                    </div>
                    <span style={{ fontWeight: 600, color: '#dc2626' }}>−{fmt(quotation.discountAmount)} AED</span>
                  </div>
                )}
                {/* VAT */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #e2e8f0', fontSize: 11 }}>
                  <div>
                    <div style={{ color: '#64748b' }}>VAT ({quotation.taxPercent}%)</div>
                    <div className="ar" style={{ fontSize: 9, color: '#94a3b8' }}>ضريبة القيمة المضافة</div>
                  </div>
                  <span style={{ fontWeight: 600 }}>+{fmt(quotation.taxAmount)} AED</span>
                </div>
                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 11px', background: BRAND }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>TOTAL</div>
                    <div className="ar" style={{ fontSize: 10, color: '#bfdbfe' }}>الإجمالي</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{fmt(quotation.total)} AED</span>
                </div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── TERMS ── */}
        {quotation.terms && (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, marginBottom: 16 }}>
            <div className="bilabel" style={{ marginBottom: 4 }}>
              <span className="bilabel-en">TERMS & CONDITIONS</span>
              <span className="bilabel-ar">الشروط والأحكام</span>
            </div>
            <div style={{ fontSize: 10, color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{quotation.terms}</div>
          </div>
        )}

        {/* ── ACCEPTANCE BLOCK ── */}
        <table style={{ width: '100%', marginBottom: 20, marginTop: 8 }}>
          <tbody><tr>
            <td style={{ width: '45%', verticalAlign: 'bottom', paddingRight: 16 }}>
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Authorized Signature</div>
                <div className="ar" style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>التوقيع المعتمد</div>
                {quotation.createdBy && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#111' }}>{quotation.createdBy.fullName}</div>
                    {quotation.createdBy.phone && (
                      <div style={{ fontSize: 10, color: '#475569' }}>Tel: {quotation.createdBy.phone}</div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 14 }}>Name / Title / Date — الاسم / المسمى / التاريخ</div>
              </div>
            </td>
            <td style={{ width: '10%' }} />
            <td style={{ width: '45%', verticalAlign: 'bottom' }}>
              <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 6 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Client Acceptance</div>
                <div className="ar" style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>موافقة العميل</div>
                <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 18 }}>Name / Signature / Date — الاسم / التوقيع / التاريخ</div>
              </div>
            </td>
          </tr></tbody>
        </table>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 9, color: '#94a3b8' }}>
          <span>{COMPANY.name} — {COMPANY.address}</span>
          <span>{quotation.quotationNumber}</span>
          <span>This is a computer-generated document / وثيقة معتمدة من الحاسب الآلي</span>
        </div>

      </div>
    </>
  );
}
