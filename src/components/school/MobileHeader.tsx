'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TITLES: Record<string, string> = {
  '/school': 'Dashboard',
  '/school/students': 'Students',
  '/school/students/new': 'Register Student',
  '/school/config': 'Settings',
  '/school/grades': 'Thresholds',
  '/school/assessors': 'Assessors',
  '/school/billing': 'Billing',
  '/school/team': 'Team',
}

export function MobileHeader({ schoolName, logoUrl }: { schoolName: string; logoUrl: string | null }) {
  const pathname = usePathname()
  const title = TITLES[pathname] ?? 'Evalent'
  const isRoot = pathname === '/school' || pathname === '/school/students' || pathname === '/school/config'

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center h-14 px-4 gap-3"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Logo/initial */}
      <div className="flex-shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={schoolName} className="h-7 w-7 rounded-md object-contain" />
        ) : (
          <div className="h-7 w-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ background: '#07112e' }}>
            {schoolName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <h1 className="flex-1 text-base font-bold text-gray-900 truncate">{title}</h1>
      {/* Register student CTA on students page */}
      {pathname === '/school/students' && (
        <Link href="/school/students/new"
          className="text-xs font-bold text-white px-3 py-1.5 rounded-lg"
          style={{ background: '#002ec1' }}>
          + Register
        </Link>
      )}
    </header>
  )
}
