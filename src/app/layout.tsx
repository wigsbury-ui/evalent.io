import type { Metadata } from "next";
import Script from "next/script";
import { Figtree, Open_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Evalent — Admissions Intelligence",
    template: "%s | Evalent",
  },
  description:
    "AI-powered admissions assessment platform for international schools",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://app.evalent.io"
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${openSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen font-sans">{children}<Script src="https://cdn.jotfor.ms/agent/embedjs/019c176d198c7a97a0b3b9b05ba3de8e8bb3/embed.js" strategy="lazyOnload" /></body>
    </html>
  );
}
