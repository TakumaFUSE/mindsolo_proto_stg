import type { MentorThreadView, MentorMessage, CustomMentor } from '@/lib/types'

const UID = 'dev-user'
const THREAD_1 = 'mthread-fix-001'
const THREAD_2 = 'mthread-fix-002'
const THREAD_3 = 'mthread-fix-003'
const CUSTOM_1 = 'custom-mentor-001'

export const FIXTURE_MENTOR_THREADS: MentorThreadView[] = [
  {
    id: THREAD_1,
    user_id: UID,
    chain_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    mentor_id: null,
    persona_id: 'stoic',
    is_builtin: true,
    mentor_name: '静観者',
    mentor_avatar: 'S',
    title: '集中と通知についての対話',
    last_message: '今日の集中が持続した理由を、あなた自身はどう言語化しますか？',
    created_at: '2026-04-26T22:40:00Z',
    updated_at: '2026-04-26T22:50:00Z',
  },
  {
    id: THREAD_2,
    user_id: UID,
    chain_id: null,
    mentor_id: null,
    persona_id: 'psychologist',
    is_builtin: true,
    mentor_name: '感情の探索者',
    mentor_avatar: 'E',
    title: '静けさが心地よい理由',
    last_message: 'その「静けさ」の中で、何を求めていたと思いますか？',
    created_at: '2026-04-27T14:00:00Z',
    updated_at: '2026-04-27T14:10:00Z',
  },
  {
    id: THREAD_3,
    user_id: UID,
    chain_id: null,
    mentor_id: CUSTOM_1,
    persona_id: null,
    is_builtin: false,
    mentor_name: '習慣コーチ',
    mentor_avatar: '習',
    title: '朝ルーティンを定着させるには',
    last_message: '今週の朝ルーティンを続けられた日と途切れた日の違いは何でしたか？',
    created_at: '2026-04-24T09:00:00Z',
    updated_at: '2026-04-24T09:15:00Z',
  },
]

export const FIXTURE_MENTOR_MESSAGES: Record<string, MentorMessage[]> = {
  [THREAD_1]: [
    {
      id: 'mmsg-001',
      thread_id: THREAD_1,
      role: 'user',
      content:
        '今日は集中できた気がします。午前中の打ち合わせ後に5分だけ骨子を書いたのが効いたかもしれません。',
      image_urls: [],
      created_at: '2026-04-26T22:41:00Z',
    },
    {
      id: 'mmsg-002',
      thread_id: THREAD_1,
      role: 'assistant',
      content:
        'その「5分だけ」という小さな開始行動が、集中モードへの入口になったようですね。コントロールできる行動を先に取ることで、その後の流れが変わった。今日の集中が持続した理由を、あなた自身はどう言語化しますか？',
      image_urls: [],
      created_at: '2026-04-26T22:42:00Z',
    },
    {
      id: 'mmsg-003',
      thread_id: THREAD_1,
      role: 'user',
      content: '通知を切ったことも大きかったと思います。',
      image_urls: [],
      created_at: '2026-04-26T22:45:00Z',
    },
    {
      id: 'mmsg-004',
      thread_id: THREAD_1,
      role: 'assistant',
      content:
        '通知は、あなたがコントロールできる外的要因の一つですね。それを意図的に排除した。その選択をした時、どんな気持ちでしたか？',
      image_urls: [],
      created_at: '2026-04-26T22:46:00Z',
    },
  ],
  [THREAD_2]: [
    {
      id: 'mmsg-005',
      thread_id: THREAD_2,
      role: 'user',
      content:
        '美術館で静かな展示を見て、とても落ち着きました。なぜこんなに心地よかったのか不思議です。',
      image_urls: [],
      created_at: '2026-04-27T14:01:00Z',
    },
    {
      id: 'mmsg-006',
      thread_id: THREAD_2,
      role: 'assistant',
      content:
        'その静けさの中で、何かが満たされた感覚があったのですね。日常の喧噪から離れた空間で、あなたの中の何かが解放されたのかもしれません。その「静けさ」の中で、何を求めていたと思いますか？',
      image_urls: [],
      created_at: '2026-04-27T14:02:00Z',
    },
  ],
  [THREAD_3]: [
    {
      id: 'mmsg-007',
      thread_id: THREAD_3,
      role: 'user',
      content: '朝のルーティンをもっと安定させたいんですが、なかなか続きません。',
      image_urls: [],
      created_at: '2026-04-24T09:01:00Z',
    },
    {
      id: 'mmsg-008',
      thread_id: THREAD_3,
      role: 'assistant',
      content:
        '習慣定着には「きっかけ→行動→報酬」のサイクルが重要です。今週の朝ルーティンを続けられた日と途切れた日の違いは何でしたか？',
      image_urls: [],
      created_at: '2026-04-24T09:02:00Z',
    },
  ],
}

export const FIXTURE_CUSTOM_MENTORS: CustomMentor[] = [
  {
    id: CUSTOM_1,
    user_id: UID,
    name: '習慣コーチ',
    description: '習慣形成と行動変容を専門とする実践的なコーチ。具体的なアドバイスを提供します。',
    system_prompt: `あなたは習慣形成の専門家です。ユーザーの行動パターンを分析し、具体的で実行可能なアドバイスを提供します。

スタイル:
- 具体的な行動提案を優先する
- 小さな成功体験を重視する
- データに基づいた観察を行う
- 返答は簡潔で実践的に`,
    tone: '実践的',
    created_at: '2026-04-20T10:00:00Z',
  },
]
