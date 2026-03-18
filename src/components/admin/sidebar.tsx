"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard, School, Key, Bot, FileText, ScrollText,
  LogOut, Video, CreditCard, UserCheck, Wallet, Target, PenSquare,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: any;
  exact?: boolean;
  matchPaths?: string[];
  section?: string; // section label shown above this item
};

const NAV: NavItem[] = [
  { href: "/admin",             label: "Dashboard",        icon: LayoutDashboard, exact: true },

  { href: "/admin/schools",     label: "Schools",          icon: School,      section: "Business" },
  { href: "/admin/billing",     label: "Billing",          icon: CreditCard },
  { href: "/admin/targets",     label: "Targets",          icon: Target },

  { href: "/admin/content",     label: "Content Studio",   icon: PenSquare,   section: "Content",
    matchPaths: ["/admin/content", "/admin/partner-videos"] },

  { href: "/admin/answer-keys", label: "Answer Keys",      icon: Key,         section: "Platform" },
  { href: "/admin/prompts",     label: "AI Prompts",       icon: Bot },
  { href: "/admin/reports",     label: "Report Templates", icon: FileText },
  { href: "/admin/help-videos", label: "Help Videos",      icon: Video },

  { href: "/admin/partners",    label: "Partners",         icon: UserCheck,   section: "Partners" },
  { href: "/admin/payouts",     label: "Payouts",          icon: Wallet },

  { href: "/admin/audit",       label: "Audit Log",        icon: ScrollText,  section: "System" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="p-6 border-b border-gray-100">
        <Link href="/admin">
          <Image src="/evalent-logo-new.png" alt="Evalent" width={120} height={22} className="h-auto w-auto" style={{height:22}} />
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact, matchPaths, section }) => {
          const active = exact
            ? pathname === href
            : (matchPaths
                ? matchPaths.some(p => pathname.startsWith(p))
                : pathname.startsWith(href));
          return (
            <div key={href}>
              {section && (
                <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-300 select-none">
                  {section}
                </p>
              )}
              <Link
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
            </div>
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
