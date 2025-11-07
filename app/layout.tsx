// app/layout.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0; // valid: number or false

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
