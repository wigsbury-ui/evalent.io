// app/layout.tsx
export const metadata = { title: "Evalent" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}>{children}</body>
    </html>
  );
}
