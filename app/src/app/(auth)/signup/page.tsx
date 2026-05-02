'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()

  return (
    <>
      <div className="mb-3">
        <h2 className="text-[1.06rem] font-extrabold text-ink">アカウント作成</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">3ステップで開始できます。</p>
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          router.push('/feed')
        }}
      >
        <label className="mb-2.5 block">
          <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">表示名</span>
          <input type="text" placeholder="Hiroki" autoComplete="name" />
        </label>
        <label className="mb-2.5 block">
          <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">
            メールアドレス
          </span>
          <input type="email" placeholder="you@example.com" autoComplete="email" />
        </label>
        <label className="mb-2.5 block">
          <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">パスワード</span>
          <input type="password" autoComplete="new-password" />
        </label>
        <label className="mb-3 block">
          <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">
            確認用パスワード
          </span>
          <input type="password" autoComplete="new-password" />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl py-2.5 text-[0.94rem] font-bold text-white"
          style={{
            background: 'linear-gradient(180deg, #ef7a4a 0%, #e56033 100%)',
            border: '1px solid #df5d2f',
            boxShadow: '0 8px 17px rgba(221, 95, 50, 0.27)',
          }}
        >
          無料で始める
        </button>
      </form>

      <Link
        href="/login"
        className="mt-2 flex w-full items-center justify-center rounded-xl border border-line bg-white py-2.5 text-[0.94rem] font-medium text-ink"
      >
        ログインに戻る
      </Link>
    </>
  )
}
