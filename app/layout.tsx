import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Evalent Pro Pack',
  description: 'Admissions testing platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{maxWidth: 900, margin: '0 auto', padding: 24}}>
          <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h1>Evalent</h1>
            <nav style={{display:'flex', gap:12}}>
              <a href="/">Start</a>
              <a href="/admin">Admin</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
