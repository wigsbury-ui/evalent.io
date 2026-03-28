import type { Metadata } from "next";
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
      <body className="min-h-screen font-sans">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then(r => console.log('SW registered'))
                .catch(e => console.log('SW failed', e))
            })
          }
        ` }} />
      </body>
    </html>
  );
}
