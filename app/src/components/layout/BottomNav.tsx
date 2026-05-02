'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = { href: string; label: string; isWrite?: boolean }

const NAV_ITEMS: NavItem[] = [
  { href: '/feed',        label: 'feed' },
  { href: '/mentor',      label: 'mentor' },
  { href: '/entry/write', label: 'write', isWrite: true },
  { href: '/discover',    label: 'discover' },
  { href: '/setting',     label: 'setting' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#e8d7ca]"
      style={{ background: 'linear-gradient(180deg, #fff9f3 0%, #fff 100%)' }}
    >
      <div className="mx-auto flex w-full max-w-md items-end justify-around px-2.5 pb-[env(safe-area-inset-bottom,12px)] pt-2">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          if (item.isWrite) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="新しいエントリを書く"
                className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white"
                style={{
                  background: 'linear-gradient(180deg, #2fb9af 0%, #14938b 100%)',
                  boxShadow: '0 8px 20px rgba(17, 130, 124, 0.38)',
                }}
              >
                +
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-full border px-3 py-2 text-[0.78rem] font-bold transition-colors',
                isActive
                  ? 'border-[#75cbbf] bg-[#eafcf8] text-[#0f847b]'
                  : 'border-[#ead8c8] bg-white text-[#6f6259]',
              ].join(' ')}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
