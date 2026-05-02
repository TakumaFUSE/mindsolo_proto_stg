export default function HomePage() {
  return (
    <div className="relative flex min-h-screen items-start justify-center px-4 py-10">
      {/* Background orbs */}
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />

      {/* Phone frame */}
      <div
        className="relative flex w-full max-w-[400px] flex-col overflow-hidden rounded-[42px] border border-[#221a14]"
        style={{ boxShadow: 'var(--shadow-device)', minHeight: 600 }}
      >
        {/* Screen background */}
        <div
          className="flex flex-1 flex-col bg-surface-strong p-4"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,249,240,0.94) 100%), repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(238,224,209,0.22) 24px, rgba(238,224,209,0.22) 25px)',
          }}
        >
          {/* Auth hero */}
          <div
            className="mb-3 rounded-xl border border-[#efc8ad] p-4"
            style={{
              background: 'linear-gradient(145deg, #ffe8d8 0%, #fff5eb 60%, #fff 100%)',
            }}
          >
            <p className="text-[0.74rem] font-extrabold tracking-widest uppercase text-[#a16142]">
              Reflect Better
            </p>
            <h2 className="mt-1 text-[1.45rem] font-extrabold leading-tight tracking-tight text-ink">
              今日の気持ちを、
              <br />明日の意思決定へ。
            </h2>

            {/* Hero stats */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md border border-[#f0d4bf] bg-surface-strong p-3">
                <strong className="block text-[1.1rem] font-extrabold text-ink">
                  13k+
                </strong>
                <span className="text-[0.74rem] text-muted">Saved Entries</span>
              </div>
              <div className="rounded-md border border-[#f0d4bf] bg-surface-strong p-3">
                <strong className="block text-[1.1rem] font-extrabold text-ink">
                  4.9
                </strong>
                <span className="text-[0.74rem] text-muted">User Rating</span>
              </div>
            </div>
          </div>

          {/* Email */}
          <label className="mb-2.5 block">
            <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">
              メールアドレス
            </span>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full rounded-[13px] border border-[#e8d5c6] px-3 py-2.5 text-[0.94rem] text-ink outline-none"
              style={{ background: 'linear-gradient(180deg, #fff 0%, #fffaf4 100%)' }}
            />
          </label>

          {/* Password */}
          <label className="mb-2.5 block">
            <span className="mb-1.5 block text-[0.81rem] font-semibold text-muted">
              パスワード
            </span>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-[13px] border border-[#e8d5c6] px-3 py-2.5 text-[0.94rem] text-ink outline-none"
              style={{ background: 'linear-gradient(180deg, #fff 0%, #fffaf4 100%)' }}
            />
          </label>

          {/* Primary button */}
          <button
            className="mt-1 w-full rounded-[12px] py-2.5 text-[0.94rem] font-bold text-white"
            style={{
              background: 'linear-gradient(180deg, #ef7a4a 0%, #e56033 100%)',
              border: '1px solid #df5d2f',
              boxShadow: '0 8px 17px rgba(221, 95, 50, 0.27)',
            }}
          >
            ログイン
          </button>

          {/* Ghost button */}
          <button className="mt-2 w-full rounded-[12px] border border-line bg-white py-2.5 text-[0.94rem] font-medium text-ink">
            新規登録
          </button>

          {/* Text button */}
          <button className="mt-2 w-full py-1.5 text-[0.82rem] text-[#8a7a6f]">
            パスワードを忘れた場合
          </button>

          <div className="mt-2 flex justify-between gap-2">
            <button className="text-[0.75rem] text-[#83756c]">利用規約</button>
            <a href="#" className="text-[0.75rem] text-[#83756c]">
              プライバシーポリシー
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
