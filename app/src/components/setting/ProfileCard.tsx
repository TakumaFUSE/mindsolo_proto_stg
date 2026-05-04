type Props = { email: string }

export default function ProfileCard({ email }: Props) {
  return (
    <div className="rounded-[16px] border border-[#ede3d8] bg-white px-4 py-3">
      <h2 className="mb-2 text-[0.88rem] font-extrabold text-ink">アカウント設定</h2>
      <p className="mb-3 text-[0.78rem] text-muted">{email}</p>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.82rem] text-[#5f544b]">メールアドレス変更</span>
          <button
            disabled
            className="rounded-[8px] border border-[#ede3d8] bg-[#f8f4f0] px-3 py-1 text-[0.72rem] font-bold text-[#c4b4a8] opacity-60"
          >
            変更
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[0.82rem] text-[#5f544b]">パスワード変更</span>
          <button
            disabled
            className="rounded-[8px] border border-[#ede3d8] bg-[#f8f4f0] px-3 py-1 text-[0.72rem] font-bold text-[#c4b4a8] opacity-60"
          >
            変更
          </button>
        </div>
      </div>
    </div>
  )
}
