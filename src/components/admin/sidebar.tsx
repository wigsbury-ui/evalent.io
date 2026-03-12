"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard,
  School,
  Key,
  Bot,
  FileText,
  ScrollText,
  LogOut,
  Video,
  CreditCard,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/schools", label: "Schools", icon: School },
    { href: "/admin/billing", label: "Billing", icon: CreditCard },
    { href: "/admin/answer-keys", label: "Answer Keys", icon: Key },
    { href: "/admin/prompts", label: "AI Prompts", icon: Bot },
    { href: "/admin/reports", label: "Report Templates", icon: FileText },
    { href: "/admin/help-videos", label: "Help Videos", icon: Video },
    { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <Link href="/admin">
          <Image
            src="/evalent-logo.png"
            alt="Evalent"
            width={120}
            height={32}
            className="h-8 w-auto"
          />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-evalent-50 text-evalent-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-5 w-5 text-gray-400" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
        >
          <LogOut className="h-5 w-5 text-gray-400" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
