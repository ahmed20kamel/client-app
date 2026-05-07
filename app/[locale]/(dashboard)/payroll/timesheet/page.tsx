import { redirect } from 'next/navigation';

export default async function TimesheetIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  redirect(`/${locale}/payroll/timesheet/${period}`);
}
