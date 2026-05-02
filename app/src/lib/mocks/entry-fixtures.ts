import type { EntryDetail } from '@/lib/entry'

const CHAIN_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const CHAIN_B = 'bbbbbbbb-0000-0000-0000-000000000002'
const CHAIN_C = 'cccccccc-0000-0000-0000-000000000003'
const UID = 'dev-user'

export const FIXTURE_ENTRY_DETAILS: EntryDetail[] = [
  {
    id: 'entry-001',
    user_id: UID,
    chain_id: CHAIN_A,
    content:
      '午前の打ち合わせ後に、先に5分だけ資料の骨子を書いたことでそのまま集中に入れた。通知を切っていたことも効果があった。',
    image_urls: [],
    ai_status: 'done',
    summary: '今日は作業の立ち上がりが早く、集中が途切れにくかった。',
    tags: ['集中'],
    interpretation:
      'あなたは「明確な開始条件」があると行動に移りやすい傾向があります。小タスク化と時間制限の組み合わせが強みです。過去の習慣記録とも共通するパターンが見られます。',
    helpful_info:
      '集中の再現性を高めるために、明日の朝に「開始5分で終わるタスク」を1つ事前設定してみましょう。',
    related_entry_ids: ['entry-003', 'entry-005'],
    deleted_at: null,
    created_at: '2026-04-26T21:10:00Z',
    updated_at: '2026-04-26T21:15:00Z',
    related_entries: [
      {
        id: 'entry-003',
        summary: '朝ルーティンの効果を確認した。',
        content: '朝のルーティンを試した記録。開始5分の効果を確認。',
        created_at: '2026-04-24T08:20:00Z',
        tags: ['習慣'],
      },
      {
        id: 'entry-005',
        summary: 'デザイン書から3つの重要論点を抽出した。',
        content: 'デザイン関連の読書メモ。印象に残った3つの論点を整理。',
        created_at: '2026-04-22T20:10:00Z',
        tags: ['読書'],
      },
    ],
    chain_thread_id: 'thread-001',
  },
  {
    id: 'entry-002',
    user_id: UID,
    chain_id: CHAIN_A,
    content: '展示で気づいた「静けさ」の美しさ。写真と一緒に記録したい。',
    image_urls: [],
    ai_status: 'done',
    summary: '美術館で静謐な体験。内省的な気分になった。',
    tags: ['旅'],
    interpretation:
      '静かな環境に強く反応する傾向が見られます。内省が深まるのは「余白のある空間」にいるときが多いようです。',
    helpful_info:
      '次の週末に「音のない場所」を30分だけ訪れてみましょう。図書館や公園の早朝がおすすめです。',
    related_entry_ids: ['entry-001'],
    deleted_at: null,
    created_at: '2026-04-27T12:30:00Z',
    updated_at: '2026-04-27T12:35:00Z',
    related_entries: [
      {
        id: 'entry-001',
        summary: '今日は作業の立ち上がりが早く、集中が途切れにくかった。',
        content: '午前の打ち合わせ後に、先に5分だけ資料の骨子を書いたことでそのまま集中に入れた。',
        created_at: '2026-04-26T21:10:00Z',
        tags: ['集中'],
      },
    ],
    chain_thread_id: 'thread-001',
  },
  {
    id: 'entry-003',
    user_id: UID,
    chain_id: CHAIN_B,
    content: '朝のルーティンを試した記録。開始5分の効果を確認。',
    image_urls: [],
    ai_status: 'done',
    summary: '朝ルーティンの効果を確認した。',
    tags: ['習慣'],
    interpretation:
      '継続的な習慣形成に取り組んでいます。小さな成功体験を積み重ねることが、長期的なルーティン定着につながります。',
    helpful_info:
      '今週中に「開始のトリガー」を1つ明確に定義してみましょう。例えば「コーヒーを飲んだらすぐに作業を始める」など。',
    related_entry_ids: ['entry-001'],
    deleted_at: null,
    created_at: '2026-04-24T08:20:00Z',
    updated_at: '2026-04-24T08:25:00Z',
    related_entries: [
      {
        id: 'entry-001',
        summary: '今日は作業の立ち上がりが早く、集中が途切れにくかった。',
        content: '午前の打ち合わせ後に、先に5分だけ資料の骨子を書いたことでそのまま集中に入れた。',
        created_at: '2026-04-26T21:10:00Z',
        tags: ['集中'],
      },
    ],
    chain_thread_id: null,
  },
  {
    id: 'entry-005',
    user_id: UID,
    chain_id: CHAIN_C,
    content: 'デザイン関連の読書メモ。印象に残った3つの論点を整理。',
    image_urls: [],
    ai_status: 'done',
    summary: 'デザイン書から3つの重要論点を抽出した。',
    tags: ['読書'],
    interpretation:
      '知識を体系的に整理する能力が高いです。論点を抽出する習慣は、今後の意思決定にも役立ちます。',
    helpful_info:
      '読んだ内容を24時間以内に誰かに説明する機会を作ると、記憶定着率が大幅に上がります。',
    related_entry_ids: ['entry-003'],
    deleted_at: null,
    created_at: '2026-04-22T20:10:00Z',
    updated_at: '2026-04-22T20:15:00Z',
    related_entries: [
      {
        id: 'entry-003',
        summary: '朝ルーティンの効果を確認した。',
        content: '朝のルーティンを試した記録。開始5分の効果を確認。',
        created_at: '2026-04-24T08:20:00Z',
        tags: ['習慣'],
      },
    ],
    chain_thread_id: null,
  },
]
