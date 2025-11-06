// app/layout.tsx
export const metadata = {
  title: 'Evalent',
  description: 'Admissions testing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui' }}>{children}</body>
    </html>
  );
}
