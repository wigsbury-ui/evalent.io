// app/page.tsx
export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 64, lineHeight: 1.05 }}>Evalent</h1>
      <p>Root page. Open a test session via your helper page to get a token, then visit <code>/t/&lt;token&gt;</code>.</p>
    </main>
  );
}
