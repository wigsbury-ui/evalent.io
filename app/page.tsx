// app/page.tsx  (simple home so the app builds)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Evalent</h1>
      <p>Go to <code>/dev/start</code> to create a demo session link.</p>
    </main>
  );
}
