'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, UserPlus, Settings } from 'lucide-react'

const TABS = [
  { href: '/school', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/school/students', label: 'Students', icon: UserPlus },
  { href: '/school/config', label: 'Settings', icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex safe-area-pb"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/school' && pathname.startsWith(href))
        return (
          <Link key={href} href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition-colors ${active ? 'text-[#002ec1]' : 'text-gray-400'}`}>
            <Icon className={`h-5 w-5 ${active ? 'text-[#002ec1]' : 'text-gray-400'}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
