import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
