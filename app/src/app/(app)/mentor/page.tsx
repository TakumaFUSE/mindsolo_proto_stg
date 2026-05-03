import Link from 'next/link'
import { PERSONAS } from '@/lib/personas'
import { getThreads, getCustomMentors } from '@/lib/mentor'
import PersonaCard from '@/components/mentor/PersonaCard'
import ThreadCard from '@/components/mentor/ThreadCard'

const DEV_BYPASS =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true' ||
  !process.env.NEXT_PUBLIC_SUPABASE_URL

export default async function MentorPage() {
  let userId = 'dev-user'

  if (!DEV_BYPASS) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) userId = user.id
  }

  const [threads, customMentors] = await Promise.all([
    getThreads(userId),
    getCustomMentors(userId),
  ])

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[1.05rem] font-extrabold text-ink">メンター</h2>
        <Link
          href="/mentor/add"
          className="rounded-full bg-[#f5d5b8] px-3 py-1 text-[0.74rem] font-bold text-[#9b5f41]"
        >
          + カスタム作成
        </Link>
      </div>

      {/* Recent threads */}
      {threads.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-[0.78rem] font-extrabold uppercase tracking-widest text-[#a16142]">
            最近の対話
          </h3>
          <div className="flex flex-col gap-2">
            {threads.map(t => (
              <ThreadCard key={t.id} thread={t} />
            ))}
          </div>
        </section>
      )}

      {/* Built-in personas */}
      <section className="mb-6">
        <h3 className="mb-2 text-[0.78rem] font-extrabold uppercase tracking-widest text-[#a16142]">
          ビルトインペルソナ
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PERSONAS.map(p => (
            <PersonaCard key={p.id} persona={p} />
          ))}
        </div>
      </section>

      {/* Custom mentors */}
      {customMentors.length > 0 && (
        <section>
          <h3 className="mb-2 text-[0.78rem] font-extrabold uppercase tracking-widest text-[#a16142]">
            カスタムメンター
          </h3>
          <div className="flex flex-col gap-2">
            {customMentors.map(m => (
              <div key={m.id} className="rounded-[16px] border border-[#ede3d8] bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8ddd6] text-[0.78rem] font-extrabold text-[#7a5c48]">
                    {m.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-[0.82rem] font-extrabold text-ink">{m.name}</p>
                    {m.tone && (
                      <p className="text-[0.68rem] font-semibold text-[#c08060]">{m.tone}</p>
                    )}
                  </div>
                </div>
                {m.description && (
                  <p className="mt-1.5 text-[0.74rem] leading-snug text-muted">{m.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
