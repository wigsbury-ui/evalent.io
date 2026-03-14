"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Link2, TrendingUp, DollarSign,
  BookOpen, LogOut, Menu, X
} from "lucide-react";

const nav = [
  { href: "/partner/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { href: "/partner/links",        label: "My Links",     icon: Link2 },
  { href: "/partner/conversions",  label: "Conversions",  icon: TrendingUp },
  { href: "/partner/payouts",      label: "Payouts",      icon: DollarSign },
  { href: "/partner/resources",    label: "Resources",    icon: BookOpen },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    if (pathname === "/partner/login") return;
    fetch("/api/partner/me")
      .then(r => { if (r.status === 401) router.push("/partner/login"); return r.json(); })
      .then(d => { if (d.partner) setPartner(d.partner); });
  }, [pathname]);

  if (pathname === "/partner/login") return <>{children}</>;

  const handleLogout = async () => {
    await fetch("/api/partner/logout", { method: "POST" });
    router.push("/partner/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 fixed inset-y-0">
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <span className="text-lg font-bold text-[#0d52dd]">Evalent</span>
          <span className="ml-2 text-xs text-gray-400 font-medium">Partners</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? "bg-blue-50 text-[#0d52dd] font-medium" : "text-gray-600 hover:bg-gray-50"
                }`}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          {partner && (
            <div className="mb-3 px-1">
              <p className="text-xs font-medium text-gray-800">{partner.first_name} {partner.last_name}</p>
              <p className="text-xs text-gray-400 truncate">{partner.email}</p>
            </div>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700 transition-colors px-1">
            <LogOut className="h-3.5 w-3.5" />Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
