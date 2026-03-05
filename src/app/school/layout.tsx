import Script from "next/script";
import { SchoolSidebar } from "@/components/school/sidebar";

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SchoolSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        <Script src="https://cdn.jotfor.ms/agent/embedjs/019c176d198c7a97a0b3b9b05ba3de8e8bb3/embed.js" strategy="lazyOnload" />
      </main>
    </div>
  );
}
