import ProfileCard from '@/components/setting/ProfileCard'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export default async function SettingPage() {
  let email = 'dev@example.com'

  if (!DEV_BYPASS) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    email = user?.email ?? ''
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 pb-24">
      <h1 className="text-[1.05rem] font-extrabold text-ink">設定</h1>

      {/* Dev bypass badge */}
      {DEV_BYPASS && (
        <div className="flex items-center gap-2 rounded-[10px] border border-[#b5d8f0] bg-[#e8f4fd] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#2980b9]" />
          <p className="text-[0.72rem] font-bold text-[#1a6690]">Dev bypass モード ON</p>
        </div>
      )}

      <ProfileCard email={email} />

      {/* 利用プラン */}
      <div className="rounded-[16px] border border-[#ede3d8] bg-white px-4 py-3">
        <h2 className="mb-2 text-[0.88rem] font-extrabold text-ink">利用プラン</h2>
        <div className="flex items-center justify-between">
          <span className="text-[0.82rem] text-[#5f544b]">現在のプラン</span>
          <span className="rounded-full border border-[#d4c5b8] bg-[#f5ece6] px-3 py-0.5 text-[0.72rem] font-bold text-[#6b5d54]">
            Free
          </span>
        </div>
        <p className="mt-2 text-[0.74rem] text-muted">
          Pro プランにアップグレードすると、さらに多くの機能が使えます。
        </p>
      </div>

      {/* 表示設定 (placeholder) */}
      <div className="rounded-[16px] border border-[#ede3d8] bg-white px-4 py-3">
        <h2 className="mb-2 text-[0.88rem] font-extrabold text-ink">表示</h2>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[0.82rem] text-[#5f544b]">フォントサイズ</span>
            <button
              disabled
              className="rounded-[8px] border border-[#ede3d8] bg-[#f8f4f0] px-3 py-1 text-[0.72rem] font-bold text-[#c4b4a8] opacity-60"
            >
              標準
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[0.82rem] text-[#5f544b]">言語</span>
            <button
              disabled
              className="rounded-[8px] border border-[#ede3d8] bg-[#f8f4f0] px-3 py-1 text-[0.72rem] font-bold text-[#c4b4a8] opacity-60"
            >
              日本語
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
