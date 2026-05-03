'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      if (!DEV_BYPASS) {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase.auth.signOut()
      }
      router.push('/login')
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-[16px] border border-[#f0d0c8] bg-[#fff4f2] py-3 text-[0.88rem] font-bold text-[#c0392b] transition active:scale-[0.98] disabled:opacity-50"
    >
      {loading ? 'ログアウト中...' : 'ログアウト'}
    </button>
  )
}
