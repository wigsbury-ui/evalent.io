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

export function SchoolSidebar({ schoolName = "School Admin", logoUrl = null }: { schoolName?: string; logoUrl?: string | null }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Fixed icon rail — always 56px wide, never moves */}
      <div className="fixed left-0 top-0 h-screen w-14 bg-white border-r border-gray-100 z-50 flex flex-col shrink-0" />

      {/* Spacer so content doesn't go under the rail */}
      <div className="w-14 shrink-0" />

      {/* Slide-out panel — overlays content, starts at 56px, expands to 224px */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className="fixed left-0 top-0 h-screen bg-white border-r border-gray-100 z-50 flex flex-col transition-[width] duration-200 ease-in-out overflow-hidden"
        style={{ width: expanded ? 224 : 56 }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-gray-100 shrink-0 px-3">
          <div className="flex items-center gap-3 min-w-0 w-full">
            {logoUrl ? (
              <img src={logoUrl} alt={schoolName} className="h-8 w-8 shrink-0 rounded-lg object-contain" />
            ) : (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white font-bold text-sm"
                style={{ backgroundColor: "#1a2b6b", minWidth: 32, minHeight: 32 }}
              >
                {schoolName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden" style={{ width: expanded ? 148 : 0, transition: "width 200ms ease-in-out" }}>
              <p className="truncate text-sm font-semibold text-gray-900 leading-tight whitespace-nowrap">{schoolName}</p>
              <p className="text-xs text-gray-400 leading-tight whitespace-nowrap">School Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/school" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center rounded-lg py-2 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden justify-center",
                  isActive ? "text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
                style={isActive ? { backgroundColor: "#1a2b6b" } : {}}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-gray-400")} />
                <span
                  className="overflow-hidden whitespace-nowrap"
                  style={{ width: expanded ? 164 : 0, marginLeft: expanded ? 12 : 0, transition: "width 200ms ease-in-out, margin-left 200ms ease-in-out" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-2 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="flex w-full items-center rounded-lg py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 whitespace-nowrap overflow-hidden justify-center"
          >
            <LogOut className="h-5 w-5 shrink-0 text-gray-400" />
            <span
              className="overflow-hidden whitespace-nowrap"
              style={{ width: expanded ? 164 : 0, marginLeft: expanded ? 12 : 0, transition: "width 200ms ease-in-out, margin-left 200ms ease-in-out" }}
            >
              Sign out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
