import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Stride ERP <noreply@stride-erp.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set, skipping email send');
    console.warn(`[Email] Skipped send — To: ${to} | Subject: ${subject}`);
    return null;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    return null;
  }
}

// Email template with RTL support
function wrapInTemplate(content: string, locale: string = 'en') {
  const isRTL = locale === 'ar';
  return `
    <!DOCTYPE html>
    <html lang="${locale}" dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0; padding: 0;
          background-color: #f4f4f5;
          direction: ${isRTL ? 'rtl' : 'ltr'};
          text-align: ${isRTL ? 'right' : 'left'};
        }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .logo { text-align: center; margin-bottom: 24px; }
        .logo h1 { color: #0F4C3A; font-size: 24px; margin: 0; }
        h2 { color: #18181b; font-size: 20px; margin: 0 0 16px; }
        p { color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #0F4C3A, #0D9488);
          color: #ffffff !important; text-decoration: none;
          padding: 12px 32px; border-radius: 12px;
          font-weight: 600; font-size: 14px; margin: 16px 0;
        }
        .info-box { background: #f4f4f5; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .info-box p { margin: 4px 0; font-size: 13px; }
        .footer { text-align: center; margin-top: 24px; color: #a1a1aa; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo"><h1>Stride ERP</h1></div>
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Stride ERP. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Password reset email
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  locale: string = 'en'
) {
  const resetUrl = `${APP_URL}/${locale}/reset-password?token=${token}`;
  const isAr = locale === 'ar';

  const content = isAr
    ? `
      <h2>إعادة تعيين كلمة المرور</h2>
      <p>اضغط على الزر أدناه لإعادة تعيين كلمة المرور:</p>
      <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور</a>
      <p>صلاحية هذا الرابط ساعة واحدة. إذا لم تطلب ذلك، تجاهل هذا البريد.</p>
    `
    : `
      <h2>Reset Your Password</h2>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" class="button">Reset Password</a>
      <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
    `;

  return sendEmail({
    to: email,
    subject: isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Your Password',
    html: wrapInTemplate(content, locale),
  });
}

// Task assigned email
export async function sendTaskAssignedEmail(
  to: string,
  taskTitle: string,
  assignedBy: string,
  dueDate: string | null,
  taskUrl: string,
  locale: string = 'en'
) {
  const isAr = locale === 'ar';
  const fullUrl = `${APP_URL}${taskUrl}`;

  const content = isAr
    ? `
      <h2>مهمة جديدة مسندة إليك</h2>
      <p>تم إسناد مهمة جديدة إليك بواسطة <strong>${esc(assignedBy)}</strong></p>
      <div class="info-box">
        <p><strong>المهمة:</strong> ${esc(taskTitle)}</p>
        ${dueDate ? `<p><strong>تاريخ الاستحقاق:</strong> ${esc(dueDate)}</p>` : ''}
      </div>
      <a href="${fullUrl}" class="button">عرض المهمة</a>
    `
    : `
      <h2>New Task Assigned</h2>
      <p>A new task has been assigned to you by <strong>${esc(assignedBy)}</strong></p>
      <div class="info-box">
        <p><strong>Task:</strong> ${esc(taskTitle)}</p>
        ${dueDate ? `<p><strong>Due Date:</strong> ${esc(dueDate)}</p>` : ''}
      </div>
      <a href="${fullUrl}" class="button">View Task</a>
    `;

  return sendEmail({
    to,
    subject: isAr ? `مهمة جديدة: ${taskTitle}` : `New Task: ${taskTitle}`,
    html: wrapInTemplate(content, locale),
  });
}

// Task status changed email
export async function sendTaskStatusEmail(
  to: string,
  taskTitle: string,
  status: string,
  changedBy: string,
  reason: string | null,
  taskUrl: string,
  locale: string = 'en'
) {
  const isAr = locale === 'ar';
  const fullUrl = `${APP_URL}${taskUrl}`;

  const statusLabels: Record<string, { en: string; ar: string }> = {
    SUBMITTED: { en: 'Submitted for Approval', ar: 'مُرسلة للاعتماد' },
    APPROVED: { en: 'Approved', ar: 'معتمدة' },
    REJECTED: { en: 'Rejected', ar: 'مرفوضة' },
    DONE: { en: 'Completed', ar: 'مكتملة' },
  };

  const statusLabel = statusLabels[status]?.[isAr ? 'ar' : 'en'] || status;

  const content = isAr
    ? `
      <h2>تحديث حالة المهمة</h2>
      <p>تم تغيير حالة المهمة بواسطة <strong>${esc(changedBy)}</strong></p>
      <div class="info-box">
        <p><strong>المهمة:</strong> ${esc(taskTitle)}</p>
        <p><strong>الحالة الجديدة:</strong> ${esc(statusLabel)}</p>
        ${reason ? `<p><strong>السبب:</strong> ${esc(reason)}</p>` : ''}
      </div>
      <a href="${fullUrl}" class="button">عرض المهمة</a>
    `
    : `
      <h2>Task Status Update</h2>
      <p>Task status has been changed by <strong>${esc(changedBy)}</strong></p>
      <div class="info-box">
        <p><strong>Task:</strong> ${esc(taskTitle)}</p>
        <p><strong>New Status:</strong> ${esc(statusLabel)}</p>
        ${reason ? `<p><strong>Reason:</strong> ${esc(reason)}</p>` : ''}
      </div>
      <a href="${fullUrl}" class="button">View Task</a>
    `;

  return sendEmail({
    to,
    subject: isAr ? `تحديث المهمة: ${taskTitle}` : `Task Update: ${taskTitle}`,
    html: wrapInTemplate(content, locale),
  });
}

// Quotation sent to client email
export async function sendQuotationEmail(params: {
  to: string;
  clientName: string;
  quotationNumber: string;
  projectName: string | null;
  engineerName: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  quotationUrl: string;
  companyName?: string;
}) {
  const { to, clientName, quotationNumber, projectName, engineerName, subtotal, taxAmount, total, quotationUrl, companyName } = params;
  const fullUrl = `${APP_URL}${quotationUrl}`;
  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const content = `
    <h2>Quotation ${esc(quotationNumber)}</h2>
    <p>Dear ${esc(clientName)},</p>
    <p>Please find your quotation details below. ${projectName ? `This quotation is for project: <strong>${esc(projectName)}</strong>.` : ''}</p>
    <div class="info-box">
      <p><strong>Quotation #:</strong> ${esc(quotationNumber)}</p>
      ${projectName ? `<p><strong>Project:</strong> ${esc(projectName)}</p>` : ''}
      ${engineerName ? `<p><strong>Engineer:</strong> ${esc(engineerName)}</p>` : ''}
      <p style="margin-top: 12px; border-top: 1px solid #e4e4e7; padding-top: 10px;">
        <strong>Subtotal:</strong> AED ${fmt(subtotal)}<br/>
        <strong>VAT (5%):</strong> AED ${fmt(taxAmount)}<br/>
        <strong style="font-size: 16px;">Total: AED ${fmt(total)}</strong>
      </p>
    </div>
    <p>To view the full quotation details, please click the button below:</p>
    <a href="${fullUrl}" class="button">View Quotation</a>
    <p style="font-size: 12px; color: #a1a1aa;">
      This quotation was sent by ${esc(companyName || 'our team')}.
      If you have any questions, please don't hesitate to contact us.
    </p>
  `;

  return sendEmail({
    to,
    subject: `Quotation ${quotationNumber}${projectName ? ` — ${projectName}` : ''}`,
    html: wrapInTemplate(content, 'en'),
  });
}

// Quotation status change notification (internal — to quotation creator)
export async function sendQuotationStatusEmail(params: {
  to: string;
  recipientName: string;
  quotationNumber: string;
  projectName: string | null;
  status: 'CLIENT_APPROVED' | 'CLIENT_REJECTED' | 'CONFIRMED';
  lpoNumber?: string | null;
  clientNotes?: string | null;
  total: number;
  quotationUrl: string;
}) {
  const { to, recipientName, quotationNumber, projectName, status, lpoNumber, clientNotes, total, quotationUrl } = params;
  const fmt = (n: number) => n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusMeta = {
    CLIENT_APPROVED: {
      subject: `✅ Client Approved: ${esc(quotationNumber)}`,
      heading: 'Quotation Approved by Client',
      color: '#059669',
      message: `Great news! The client has approved quotation <strong>${esc(quotationNumber)}</strong>.`,
      extra: [
        lpoNumber ? `<p><strong>LPO Number:</strong> ${esc(lpoNumber)}</p>` : '',
        clientNotes ? `<p><strong>Client Notes:</strong> ${esc(clientNotes)}</p>` : '',
      ].filter(Boolean).join(''),
      next: 'Finance confirmation is now required to proceed with production.',
    },
    CLIENT_REJECTED: {
      subject: `❌ Client Rejected: ${esc(quotationNumber)}`,
      heading: 'Quotation Declined by Client',
      color: '#dc2626',
      message: `The client has declined quotation <strong>${esc(quotationNumber)}</strong>.`,
      extra: clientNotes ? `<p><strong>Reason / Notes:</strong> ${esc(clientNotes)}</p>` : '',
      next: 'You can revise and re-send the quotation from the system.',
    },
    CONFIRMED: {
      subject: `🏦 Finance Confirmed: ${esc(quotationNumber)}`,
      heading: 'Finance Confirmation Complete',
      color: '#d97706',
      message: `Finance has confirmed the payment arrangement for quotation <strong>${esc(quotationNumber)}</strong>.`,
      extra: '',
      next: 'You can now create a Tax Invoice and proceed with delivery.',
    },
  }[status];

  const content = `
    <h2 style="color: ${statusMeta.color};">${statusMeta.heading}</h2>
    <p>Dear ${esc(recipientName)},</p>
    <p>${statusMeta.message}</p>
    <div class="info-box">
      <p><strong>Quotation #:</strong> ${esc(quotationNumber)}</p>
      ${projectName ? `<p><strong>Project:</strong> ${esc(projectName)}</p>` : ''}
      <p><strong>Total:</strong> AED ${fmt(total)}</p>
      ${statusMeta.extra}
    </div>
    <p>${statusMeta.next}</p>
    <a href="${APP_URL}${quotationUrl}" class="button">View Quotation</a>
  `;

  return sendEmail({
    to,
    subject: statusMeta.subject,
    html: wrapInTemplate(content, 'en'),
  });
}

// Performance review email
export async function sendPerformanceReviewEmail(
  to: string,
  reviewerName: string,
  period: string,
  overallRating: number,
  reviewUrl: string,
  locale: string = 'en'
) {
  const isAr = locale === 'ar';
  const fullUrl = `${APP_URL}${reviewUrl}`;
  const stars = '\u2605'.repeat(overallRating) + '\u2606'.repeat(5 - overallRating);

  const content = isAr
    ? `
      <h2>مراجعة أداء جديدة</h2>
      <p>تم إنشاء مراجعة أداء جديدة بواسطة <strong>${esc(reviewerName)}</strong></p>
      <div class="info-box">
        <p><strong>الفترة:</strong> ${esc(period)}</p>
        <p><strong>التقييم العام:</strong> <span style="color: #eab308; font-size: 18px;">${stars}</span></p>
      </div>
      <a href="${fullUrl}" class="button">عرض المراجعة</a>
    `
    : `
      <h2>New Performance Review</h2>
      <p>A new performance review has been created by <strong>${esc(reviewerName)}</strong></p>
      <div class="info-box">
        <p><strong>Period:</strong> ${esc(period)}</p>
        <p><strong>Overall Rating:</strong> <span style="color: #eab308; font-size: 18px;">${stars}</span></p>
      </div>
      <a href="${fullUrl}" class="button">View Review</a>
    `;

  return sendEmail({
    to,
    subject: isAr ? 'مراجعة أداء جديدة' : 'New Performance Review',
    html: wrapInTemplate(content, locale),
  });
}
