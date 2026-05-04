'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
        return
      }
      router.refresh()
      router.push('/feed')
    } catch (err) {
      setError((err as Error).message ?? '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Auth hero */}
      <div
        className="mb-3 rounded-xl border border-[#efc8ad] p-4"
        style={{ background: 'linear-gradient(145deg, #ffe8d8 0%, #fff5eb 60%, #fff 100%)' }}
      >
        <p className="text-[0.74rem] font-extrabold uppercase tracking-widest text-[#a16142]">
          Reflect Better
        </p>
        <h2 className="mt-1 text-[1.45rem] font-extrabold leading-tight tracking-tight text-ink">
          今日の気持ちを、
          <br />明日の意思決定へ。
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-[#f0d4bf] bg-white p-3">
            <strong className="block text-[1.1rem] font-extrabold text-ink">13k+</strong>
            <span className="text-[0.74rem] text-muted">Saved Entries</span>
          </div>
          <div className="rounded-md border border-[#f0d4bf] bg-white p-3">
            <strong className="block text-[1.1rem] font-extrabold text-ink">4.9</strong>
            <span className="text-[0.74rem] text-muted">User Rating</span>
          </div>
        </div>
      </div>

      {/* Login form */}
      <form onSubmit={handleSubmit}>
        <label className="mb-2.5 block">
          <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">
            メールアドレス
          </span>
          <input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="mb-3 block">
          <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">パスワード</span>
          <input
            type="password"
            placeholder="6文字以上"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </label>

        {error && (
          <p className="mb-3 rounded-lg bg-[#fff0eb] px-3 py-2 text-[0.83rem] text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2.5 text-[0.94rem] font-bold text-white disabled:opacity-60"
          style={{
            background: 'linear-gradient(180deg, #ef7a4a 0%, #e56033 100%)',
            border: '1px solid #df5d2f',
            boxShadow: '0 8px 17px rgba(221, 95, 50, 0.27)',
          }}
        >
          {loading ? 'ログイン中…' : 'ログイン'}
        </button>
      </form>

      <Link
        href="/signup"
        className="mt-2 flex w-full items-center justify-center rounded-xl border border-line bg-white py-2.5 text-[0.94rem] font-medium text-ink"
      >
        新規登録
      </Link>

      <Link
        href="/forgotpassword"
        className="mt-2 block w-full py-1.5 text-center text-[0.82rem] text-[#8a7a6f]"
      >
        パスワードを忘れた場合
      </Link>

      <div className="mt-2 flex justify-between gap-2">
        <Link href="/terms" className="text-[0.75rem] text-[#83756c]">
          利用規約
        </Link>
        <a href="#" className="text-[0.75rem] text-[#83756c]">
          プライバシーポリシー
        </a>
      </div>
    </>
  )
}
