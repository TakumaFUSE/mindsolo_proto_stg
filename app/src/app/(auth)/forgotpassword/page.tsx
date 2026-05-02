'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  return (
    <>
      <div className="mb-3">
        <h2 className="text-[1.06rem] font-extrabold text-ink">パスワード再設定</h2>
        <p className="mt-1.5 text-[0.86rem] text-muted">
          登録メールへ再設定リンクを送信します。
        </p>
      </div>

      <form
        onSubmit={e => {
          e.preventDefault()
          setSent(true)
        }}
      >
        <label className="mb-3 block">
          <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">
            メールアドレス
          </span>
          <input type="email" placeholder="you@example.com" autoComplete="email" />
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
          再設定メールを送信
        </button>
      </form>

      {sent && (
        <p className="mt-2 rounded-sm bg-[rgba(21,153,111,0.08)] p-2 text-center text-[0.86rem] text-good">
          再設定リンクを送信しました。メールをご確認ください。
        </p>
      )}

      <Link
        href="/login"
        className="mt-2 flex w-full items-center justify-center rounded-xl border border-line bg-white py-2.5 text-[0.94rem] font-medium text-ink"
      >
        ログインに戻る
      </Link>
    </>
  )
}
