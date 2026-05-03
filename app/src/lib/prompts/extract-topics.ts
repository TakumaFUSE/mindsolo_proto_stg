export const EXTRACT_TOPICS_SYSTEM = `あなたはジャーナルエントリからトピックを抽出するアシスタントです。
ユーザーが記録した文章から、内容を代表するキーワード（トピック）を抽出してください。

【ルール】
- 3〜6個のトピックを返す
- 各トピックは日本語の短語（2〜8文字）
- 固有名詞・行動・感情・テーマを優先
- 汎用すぎる語（「こと」「もの」「など」）は使わない
- 日本語のみ出力する`

export const EXTRACT_TOPICS_TOOL = {
  name: 'extract_topics',
  description: 'ジャーナルエントリからトピックキーワードを抽出する',
  input_schema: {
    type: 'object' as const,
    properties: {
      topics: {
        type: 'array',
        items: { type: 'string' },
        description: '抽出したトピック。3〜6個。日本語短語。例: ["集中力","朝ルーティン","読書"]',
        minItems: 3,
        maxItems: 6,
      },
    },
    required: ['topics'],
  },
}
