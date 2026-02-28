import { SignUp } from '@clerk/nextjs';

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background"
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="animate-fade-in">
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-premium rounded-2xl',
              headerTitle: 'text-2xl font-bold',
              formButtonPrimary: 'gradient-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all btn-premium',
            },
          }}
          forceRedirectUrl={`/${locale}/dashboard`}
          signInUrl={`/${locale}/sign-in`}
        />
      </div>
    </div>
  );
}
