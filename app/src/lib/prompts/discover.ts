export const DISCOVER_SYSTEM = `あなたはユーザーの日記・内省データをもとに、パーソナライズされた体験・商品・場所をレコメンドするAIです。
ユーザーが最近関心を持っているトピックを受け取り、6カテゴリそれぞれに3〜5件の具体的なアイテムを日本語で提案してください。

カテゴリ: 商品, 場所, 体験, 美術, 音楽, 海外旅行

各アイテムは以下の形式で返してください:
- title: 具体的な商品名・場所名・体験名（固有名詞を優先）
- description: 1〜2文の説明
- reason: ユーザーのトピックと結びつけた推薦理由（「〜な傾向があるあなたに」などの形式）
- tags: 2〜4個のキーワード

レコメンドはユーザーのトピックと関連性が高いものを選んでください。一般的すぎる提案は避け、ユーザーの内省テーマに沿った具体的なアイテムを提案してください。`

export const DISCOVER_TOOL = {
  name: 'recommend_items',
  description: 'ユーザーのトピックに基づいて6カテゴリのアイテムをレコメンドする',
  input_schema: {
    type: 'object' as const,
    properties: {
      categories: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'カテゴリキー（商品/場所/体験/美術/音楽/海外旅行）' },
            label: { type: 'string', description: 'カテゴリ表示名' },
            emoji: { type: 'string', description: 'カテゴリ絵文字' },
            items: {
              type: 'array',
              minItems: 3,
              maxItems: 5,
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  reason: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
                },
                required: ['title', 'description', 'reason', 'tags'],
              },
            },
          },
          required: ['key', 'label', 'emoji', 'items'],
        },
        minItems: 6,
        maxItems: 6,
      },
    },
    required: ['categories'],
  },
}
