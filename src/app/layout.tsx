import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenResearch — 코딩은 쥐뿔도 안하지만",
  description: "An AI company built with vibe coding. Community for vibe coders, AI enthusiasts, and LLM hackers.",
  metadataBase: new URL("https://openresearch.ai"),
  icons: {
    icon: "/oprs_logo.jpeg",
    apple: "/oprs_logo.jpeg",
    shortcut: "/oprs_logo.jpeg",
    other: [{ rel: "icon", url: "/oprs_logo.jpeg" }],
  },
  openGraph: {
    title: "OpenResearch — 코딩은 쥐뿔도 안하지만",
    description: "에이전트가 일하고 모두가 만드는 AI 회사",
    url: "https://openresearch.ai",
    siteName: "OpenResearch",
    images: [{ url: "/oprs_logo.jpeg" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}</Script>
          </>
        )}
      </body>
    </html>
  );
}
