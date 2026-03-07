import { Resend } from 'resend';

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'CRM Pro <noreply@crmpro.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set, skipping email send');
    console.log(`[Email Preview] To: ${to} | Subject: ${subject}`);
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
          <div class="logo"><h1>CRM Pro</h1></div>
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} CRM Pro. All rights reserved.</p>
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
      <p>تم إسناد مهمة جديدة إليك بواسطة <strong>${assignedBy}</strong></p>
      <div class="info-box">
        <p><strong>المهمة:</strong> ${taskTitle}</p>
        ${dueDate ? `<p><strong>تاريخ الاستحقاق:</strong> ${dueDate}</p>` : ''}
      </div>
      <a href="${fullUrl}" class="button">عرض المهمة</a>
    `
    : `
      <h2>New Task Assigned</h2>
      <p>A new task has been assigned to you by <strong>${assignedBy}</strong></p>
      <div class="info-box">
        <p><strong>Task:</strong> ${taskTitle}</p>
        ${dueDate ? `<p><strong>Due Date:</strong> ${dueDate}</p>` : ''}
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
      <p>تم تغيير حالة المهمة بواسطة <strong>${changedBy}</strong></p>
      <div class="info-box">
        <p><strong>المهمة:</strong> ${taskTitle}</p>
        <p><strong>الحالة الجديدة:</strong> ${statusLabel}</p>
        ${reason ? `<p><strong>السبب:</strong> ${reason}</p>` : ''}
      </div>
      <a href="${fullUrl}" class="button">عرض المهمة</a>
    `
    : `
      <h2>Task Status Update</h2>
      <p>Task status has been changed by <strong>${changedBy}</strong></p>
      <div class="info-box">
        <p><strong>Task:</strong> ${taskTitle}</p>
        <p><strong>New Status:</strong> ${statusLabel}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
      <a href="${fullUrl}" class="button">View Task</a>
    `;

  return sendEmail({
    to,
    subject: isAr ? `تحديث المهمة: ${taskTitle}` : `Task Update: ${taskTitle}`,
    html: wrapInTemplate(content, locale),
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
      <p>تم إنشاء مراجعة أداء جديدة بواسطة <strong>${reviewerName}</strong></p>
      <div class="info-box">
        <p><strong>الفترة:</strong> ${period}</p>
        <p><strong>التقييم العام:</strong> <span style="color: #eab308; font-size: 18px;">${stars}</span></p>
      </div>
      <a href="${fullUrl}" class="button">عرض المراجعة</a>
    `
    : `
      <h2>New Performance Review</h2>
      <p>A new performance review has been created by <strong>${reviewerName}</strong></p>
      <div class="info-box">
        <p><strong>Period:</strong> ${period}</p>
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
