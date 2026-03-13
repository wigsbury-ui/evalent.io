"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Settings, GraduationCap, Users, UserPlus, LogOut, CreditCard } from "lucide-react";

const navItems = [
  { href: "/school", label: "Dashboard", icon: LayoutDashboard },
  { href: "/school/students", label: "Students", icon: UserPlus },
  { href: "/school/config", label: "School Settings", icon: Settings },
  { href: "/school/grades", label: "Pass Thresholds", icon: GraduationCap },
  { href: "/school/assessors", label: "Assessors", icon: Users },
  { href: "/school/billing", label: "Billing", icon: CreditCard },
];

interface SchoolSidebarProps {
  schoolName?: string;
  logoUrl?: string | null;
}

export function SchoolSidebar({ schoolName = "School Admin", logoUrl = null }: SchoolSidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        "flex h-screen flex-col border-r border-gray-100 bg-white transition-all duration-200 ease-in-out shrink-0 z-40",
        expanded ? "w-56" : "w-14"
      )}
      style={{ overflow: "hidden" }}
    >
      <div className="flex h-14 items-center border-b border-gray-100 px-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={schoolName} className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm" style={{ backgroundColor: "#1a2b6b", minWidth: 32 }}>
              {schoolName.charAt(0).toUpperCase()}
            </div>
          )}
          {expanded && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 leading-tight">{schoolName}</p>
              <p className="text-xs text-gray-400 leading-tight">School Admin</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/school" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                isActive ? "text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
              style={isActive ? { backgroundColor: "#1a2b6b" } : {}}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-gray-400")} />
              {expanded && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 p-2 shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={!expanded ? "Sign out" : undefined}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 whitespace-nowrap"
        >
          <LogOut className="h-5 w-5 shrink-0 text-gray-400" />
          {expanded && <span>Sign out</span>}
        </button>
        {expanded && (
          <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
            <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-gray-200">
              <span className="text-[8px] font-bold text-white">E</span>
            </div>
            <span className="text-[10px] text-gray-300">Powered by Evalent</span>
          </div>
        )}
      </div>
    </aside>
  );
}
