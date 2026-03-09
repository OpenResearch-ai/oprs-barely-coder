import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { HighlightProvider } from "@/lib/highlight-context";
import RealtimeNotifications from "@/components/providers/RealtimeNotifications";
import PushNotificationSetup from "@/components/providers/PushNotificationSetup";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HighlightProvider>
        {children}
        <RealtimeNotifications />
        <PushNotificationSetup />
      </HighlightProvider>
    </NextIntlClientProvider>
  );
}
