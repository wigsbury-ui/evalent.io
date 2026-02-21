"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Settings,
  GraduationCap,
  Users,
  UserPlus,
  LogOut,
} from "lucide-react";

const navItems = [
  { href: "/school", label: "Dashboard", icon: LayoutDashboard },
  { href: "/school/config", label: "School Config", icon: Settings },
  { href: "/school/grades", label: "Grade Config", icon: GraduationCap },
  { href: "/school/assessors", label: "Assessors", icon: Users },
  { href: "/school/students", label: "Students", icon: UserPlus },
];

export function SchoolSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-evalent-600">
          <span className="text-lg font-bold text-white">E</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Evalent</p>
          <p className="text-xs text-gray-500">School Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/school" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-evalent-50 text-evalent-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive ? "text-evalent-600" : "text-gray-400"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-5 w-5 text-gray-400" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
