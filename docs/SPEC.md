# editlife 機能仕様書 (SPEC.md)

> ビジュアル正典: `mock/index.html` + `mock/styles.css`  
> 設計書原本: `docs/design_spec_pdf/editlife(仮)_設計書.pdf`  
> 本ファイルはそれらを統合した実装上の正典。矛盾が生じた場合は本ファイルを優先する。

---

## 1. プロダクトコンセプト

**サービス名:** editlife

日々の出来事・感情・思考・興味関心を気軽に記録し、AIが解釈・接続・振り返り・次の行動提案へつなげる、**自己理解と探索のためのパーソナルストックツール**。

**コアバリューループ:**

```
記録する
  ↓
AI が解釈する
  ↓
過去の自分と接続する
  ↓
自分らしさ・欲求・興味のパターンが見える
  ↓
次の問い・行動・探索につながる
  ↓
さらに記録したくなる
```

単なる日記・メモ・AIチャットではなく、このループ全体を体験させることがコアである。

---

## 2. 用語定義

| 用語 | 定義 |
|------|------|
| **Entry** | ユーザーが書いたジャーナルエントリ。本文・画像・AIタグ・AIサマリ・解釈・気の利く情報を持つ |
| **Chain** | Entry と Thread を束ねる時系列グループ。明示的なユーザー操作によって形成される木構造 |
| **Thread** | Mentor との会話スレッド。Chain に属し、Entry と同列で Chain 内に表示される |
| **Mentor** | ユーザーが登録した AI 対話相手。カスタム / テンプレート / AI提案の3種の登録方法がある |
| **Mentor Template** | 管理者が用意した「人気のメンター」プリセット（`mentor_templates` テーブル） |
| **Discover Item** | ユーザーのエントリから AI が生成した体験・場所・商品レコメンド |
| **Reflection Suggestion** | フィード上部に表示される振り返りの提案カード。バッチで生成される |
| **Tag** | AI が生成するライフスタイルタグ（例: 集中 / 旅 / 習慣）。1エントリに1〜3件 |
| **Plan** | ユーザーのサブスクリプションプラン。現フェーズは `free` のみ。将来 `pro` を追加予定 |

---

## 3. 画面別仕様

### 3.1 login

**目的:** 既存ユーザーの認証

**UI要素:**
- サービス名・ヒーローコピー
- メールアドレス・パスワード入力
- ログインボタン → feed へ遷移
- 「新規登録」→ signup
- 「パスワードを忘れた場合」→ forgotpassword
- 「利用規約」→ termsofuse

---

### 3.2 signup

**目的:** 新規ユーザー登録

**UI要素:**
- 表示名・メールアドレス・パスワード・確認用パスワード入力
- 「無料で始める」→ Supabase Auth でアカウント作成 → feed へ遷移
- 「ログインに戻る」→ login

---

### 3.3 forgotpassword

**UI要素:**
- メールアドレス入力
- 「再設定メールを送信」→ Supabase Auth の `resetPasswordForEmail()` を呼び出す
- 「ログインに戻る」→ login

---

### 3.4 termsofuse

- 利用規約の静的テキスト表示のみ

---

### 3.5 feed

**概要:** アプリのランディング画面。Reflection Suggestion と Chain 一覧を表示する。

#### ヘッダー
- ウェルカムメッセージ（「おかえりなさい、{display_name}さん」）
- 右上: 検索ボタン

#### 振り返りの提案（Reflection Suggestion）
- 横スクロールカード形式、最大3件
- 既読（クリック済み）/ 未読（未クリック）を視覚的に区別（未読: ハイライト、既読: グレーアウト）
- カード押下 → `read_at` を記録（非表示にはしない）

#### Chain 一覧

**Chain の形成ルール（実装上の正典）:**

| 操作 | 結果 |
|------|------|
| entry_write で「保存」| 新 Chain を生成。そのエントリが Chain の最初のアイテムになる |
| feed の Chain 末尾 `+` 押下 | 既存 Chain に新エントリを追加（`chain_id` を引き継いで entry_write へ遷移） |
| entry_detail の「メンターに相談する」押下 | そのエントリと同 Chain に Thread を追加 |

**Chain の表示ルール:**
- Chain 間の並び: 各 Chain 内の最新アイテムの `created_at` 降順
- Chain 内のアイテム順: `created_at` 昇順
- アイテム種別:
  - Entry カード: 日時・タグ（`tags[0]`）・サマリ表示。押下 → entry_detail
  - Thread カード: 破線スタイル。日時・メンター名表示。押下 → mentor_thread
- Chain 末尾に `+` ボタン → entry_write（`parent_chain_id` をクエリパラメータで渡す）

#### 検索（モーダル）
- 検索ボタン押下でモーダル起動
- フリーワード検索（`entries.content` と `entries.summary` 全文）
- 絞り込み: type（entry / thread）
- 並び替え: 新しい順 / 古い順

---

### 3.6 entry_write

**概要:** Entry を作成する画面。

**画面上部（固定ヘッダー）:**
- 「キャンセル」→ 入力を破棄して feed へ戻る
- 「保存」→ 後述の保存処理

**本文エリア（Tiptap リッチテキスト）**

**画像セクション:**
- 「写真を撮る」: `<input type="file" accept="image/*" capture="environment">`
- 「画像アップロード」: `<input type="file" accept="image/*" multiple>`
- アップロード済み画像を横スクロールで表示。各画像に削除ボタン

**AI問いかけエリア（「質問をもらう」押下後に展開、初期非表示）:**
- 現時点の本文をリアルタイムで Claude API に送信し、内省を深める問いかけを1件生成
- ローディング中はスケルトン表示

**深掘りメモエリア:**
- 問いかけへの回答や追加記録用のテキストエリア

**アクションチップ（画面下部）:**
- 写真を撮る / 画像アップロード / 音声入力 / 質問をもらう

**音声入力:**
- Web Speech API（`SpeechRecognition`）を使用
- フォーカス中のテキストエリア末尾に転写テキストを挿入

**保存処理:**
1. 画像を Supabase Storage にアップロード（未アップロード分）
2. `entries` テーブルに INSERT（`ai_status: 'pending'`）
3. `parent_chain_id` があればその Chain に追加（引き継ぎ）、なければ新 Chain を UUID で生成してから INSERT
4. 本文と深掘りメモを連結して `content` に保存
5. `POST /api/entries` のレスポンスから `id` を取得し `/entry/{id}` へ遷移（feed ではなく entry_detail）
6. バックグラウンドで `/api/entries/[id]/process` を非同期呼び出し（AI処理起動）

---

### 3.7 entry_detail

**概要:** Entry の詳細表示。AI生成コンテンツを含む。

**レイアウト（上から）:**

| セクション | 内容 |
|-----------|------|
| ヘッダー | 日時 + タグ badge（`tags[0]`） |
| 画像 | 横スクロール（複数枚対応） |
| エントリ本文 | AIサマリ（インラインボックス）+ 本文テキスト |
| 解釈 | AI生成テキスト + 関連エントリリンク（最大2件）→ 各 entry_detail へ |
| 気の利く情報 | AI生成テキスト + 「メンターに相談する」ボタン |

**「詳細」ボタン（InsightSection）:**
- `chain_thread_id` が既存 → その Thread へ直接遷移
- `chain_thread_id` が null → `POST /api/mentor-threads` に `source_entry_id` を送信し、エントリと同 Chain に Thread を生成してから遷移

**AI生成コンテンツのロード状態:**
- entry_write 保存直後は `ai_status: 'pending'`、AI フィールドはすべて `null` → 各セクションがスケルトン表示
  - BodySection: `summary` が null のときサマリボックスをスケルトン表示。本文テキストは即時表示
  - InterpretationSection: `interpretation` が null のときスケルトン表示。関連エントリリンクは空なら非表示
  - InsightSection: `helpful_info` が null のときスケルトン表示。「詳細」ボタンは非活性
- Phase 7 で Supabase Realtime を組み込み、`ai_status` が `done` に変化した時点でスケルトン → 実データに自動差し替え
- `ai_status = 'error'` のときは「生成に失敗しました」と「再試行」ボタンを表示（Phase 7 実装）

---

### 3.8 mentor_top

**概要:** 登録済み Mentor の一覧。

**UI要素:**
- `user_mentors` テーブルから取得（`order_index` 順）
- 各 Mentor カード押下 → 新規 Thread を作成して mentor_thread へ遷移
- 「編集」ボタン押下 → 削除 / 並び替え / 名称変更 / システムプロンプト編集モードに切り替わる
- `+` FAB → mentor_add へ遷移

---

### 3.9 mentor_add

**概要:** Mentor を登録する画面。3種の登録方法を提供する。

**① 自分だけのメンターを作る:**
- カスタムプロンプトを自由入力
- 「登録」→ `user_mentors`（`source: 'custom'`）に保存 → 新規 Thread 作成 → mentor_thread へ遷移

**② あなたにおすすめのメンター候補（AI生成）:**
- mentor_add 初回表示時にユーザーの直近5件の Entry を元にオンデマンドで Claude API が生成
- 2〜3件のペルソナ案を表示（name / description / systemPrompt）
- セッション内で React state にキャッシュ（再遷移時は再生成しない）
- 「登録」→ `user_mentors`（`source: 'ai_suggested'`）に保存 → mentor_thread へ遷移

**③ 人気のメンター:**
- `mentor_templates` テーブルから取得（`order_index` 順、管理者管理）
- 「登録」→ `user_mentors`（`source: 'template'`, `template_id` 記録）に保存 → mentor_thread へ遷移

---

### 3.10 mentor_thread

**概要:** Mentor との1対1チャット画面。Thread 単位で会話を管理する。

**ヘッダー:**
- Mentor名 / Thread名 / 「過去」ボタン

**「過去」ボタン:**
- feed へ遷移。この Thread と同 `chain_id` に属する Entry のみ表示（絞り込み状態）
- URL: `/feed?chain_id={chain_id}`

**チャットエリア:**
- User bubble（右寄せ） / AI bubble（左寄せ）
- AI応答は Vercel AI SDK `streamText()` でストリーミング表示

**クイックアクションチップ:**
- 「要点を要約」/ 「次の質問を作る」/ 「行動に変換」→ それぞれ対応するプロンプトでAIリクエスト

**入力エリア（左から右）:**
- `+` ボタン: 画像添付（`<input type="file" accept="image/*">`→ Supabase Storage へアップロード）
- テキスト入力欄
- 音声入力ボタン（Web Speech API）
- 送信ボタン

**AIコンテキスト注入:**
- この Thread と同 Chain に属する Entry の `content` をシステムプロンプトに追記してから API 呼び出し

**チャット履歴:**
- 全メッセージを `mentor_messages` テーブルに永続保存

**1メンター = 複数スレッド:** mentor_top からそのメンターを選択するたびに新規 Thread が作成される。

---

### 3.11 discover_top

**概要:** AI生成の体験・場所・商品レコメンドを探す画面。

**タイプから探す:**
- `discover_item_types` テーブルから取得（拡張可能）
- 初期値: 商品 / 場所 / 体験
- 横スクロール表示。押下 → discover_detail（タイプフィルタ付き）

**カテゴリから探す:**
- `discover_categories` テーブルから取得（拡張可能）
- 初期値: 美術 / 音楽 / 海外旅行
- 横スクロール表示。押下 → discover_detail（カテゴリフィルタ付き）

**Likes一覧:**
- `discover_likes` テーブルから取得（`liked_at` 降順）
- 絞る: タイプ / カテゴリ
- 並び替え: 新しい順 / 古い順
- アイテム押下 → アフィリエイトリンク（外部サイト）

---

### 3.12 discover_detail

**概要:** フィルタ条件に合ったレコメンドアイテム一覧。

**ヘッダー:**
- フィルタ条件表示
- 「更新」ボタン → 現フィルタ条件でAI再生成（5件）を起動

**アイテムカード（5件）:**
- タグ badge: 「関心を広げる」（`expand`）または「あなたにピッタリ」（`just_for_you`）
- アイテム画像（未設定時はプレースホルダー）
- 推薦理由テキスト
- Like ボタン → `discover_likes` に保存（title / affiliate_url も非正規化して保存）
- アフィリエイトリンク → 外部サイト（フェーズ1はダミーURL）

---

### 3.13 setting

**項目:**
- **アカウント設定:** メールアドレス・パスワード変更（Supabase Auth）
- **利用プラン:** 現在のプラン表示（`profiles.plan`）+ 将来のアップグレード導線枠（フェーズ1は表示のみ）
- **通知設定:** フェーズ1は非実装（UI非表示）
- **退会:** フェーズ1は非実装
- **表示設定:** フォントサイズ（標準 / 大 / 小）/ 言語（日本語 / English）

---

## 4. 機能仕様

### 4.1 エントリ保存時 AI 解釈処理

**トリガー:** entry_write で「保存」押下後、バックグラウンドで非同期起動  
**エンドポイント:** `POST /api/entries/[id]/process`

**1回の Claude API コールで以下を一括生成:**

| フィールド | 内容 | 制約 |
|-----------|------|------|
| `summary` | エントリの要約 | 1〜2文 |
| `tags` | ライフスタイルタグ配列 | 1〜3件。mock スタイルを参照（集中 / 旅 / 習慣 / 内省 / 読書 / 健康 / 仕事 / 学習）|
| `interpretation` | 解釈テキスト | 2〜4文 |
| `helpful_info` | 気の利く情報テキスト | 2〜4文 |
| `related_entry_ids` | 類似エントリID | 最大2件。キーワードおよび意味的類似度ベース |

**ステータス管理:**
```
pending → processing → done
                     → error（リトライ可）
```

**UI連携:** Supabase Realtime で `entries.ai_status` を購読し、`done` になったら entry_detail を自動リフレッシュ。

**モデル:** `claude-haiku-4-5-20251001`

---

### 4.2 Chain 判定ロジック

Chain の形成は **AI による自動判定ではなく、明示的なユーザー操作のみ** によって決まる。

```
新規エントリ（entry_writeから）         → 新 Chain 生成
既存 Chain の + 押下後の新規エントリ    → 同 Chain に追加（chain_id を引き継ぐ）
entry_detail の「メンターに相談する」   → 同 Chain に Thread を追加
```

`entries.chain_id` および `mentor_threads.chain_id` で管理する。  
Chain 自体は `chains` テーブルで管理し、`entries` と `mentor_threads` が FK で参照する。

---

### 4.3 Discover 生成

**生成タイミング:**
- バッチ: 毎日夜間（Vercel Cron）
- 手動: discover_detail の「更新」ボタン押下時

**生成数:** 1回あたり5件

**タグ分類:**

| タグ | プロンプト戦略 |
|------|--------------|
| `just_for_you`（あなたにピッタリ） | ユーザーの興味・価値観に直接マッチする体験を推薦するプロンプト |
| `expand`（関心を広げる） | ユーザーがまだ経験していない視点・新しい領域を提案するプロンプト |

2種類のタグはそれぞれ別プロンプトで生成する。

**入力:** ユーザーの直近エントリ + 選択されたタイプ / カテゴリ  
**出力:** `discover_recommendations` テーブルに INSERT

**タイプ・カテゴリ:** `discover_item_types` / `discover_categories` テーブルで管理（拡張可能）

---

### 4.4 Reflection Suggestion 生成

**生成タイミング:** 毎日夜間（Vercel Cron）

**ロジック:**
1. ユーザーの未読提案（`read_at IS NULL`）が3件以上 → スキップ
2. それ未満の場合 → 直近30日の Entry を入力として Claude API で生成
3. `reflection_suggestions` テーブルに INSERT（最大3件まで）

**表示仕様:**
- feed 上部に横スクロール表示（最大3件）
- 既読（`read_at IS NOT NULL`）/ 未読を視覚的に区別
- 押下時に `read_at` を記録（削除しない）

---

### 4.5 メンターおすすめ候補生成

**生成タイミング:** mentor_add の初回表示時（オンデマンド）

**入力:** ユーザーの直近5件の Entry の `content`  
**出力:** 2〜3件のメンターペルソナ案（name / description / systemPrompt）  
**キャッシュ:** React state で保持（同セッション内の再遷移時は再生成しない）

---

### 4.6 プラン・フィーチャーフラグ

**方針（B-level）:** Next.js Middleware でリクエスト時にユーザープランをチェックし、プラン未達の API アクセスを 403 でブロック。

```typescript
// src/lib/plan-features.ts
export const PLAN_FEATURES = {
  entry_ai_processing:    'free',
  mentor_chat:            'free',
  discover:               'free',
  reflection_suggestions: 'free',
  // 将来例: unlimited_entries: 'pro',
} satisfies Record<string, 'free' | 'pro'>
```

フェーズ1は全機能 `'free'` のため実質全スルー。将来は `PLAN_FEATURES` の値を `'pro'` に変更することで制限が有効になる。

`profiles.plan` カラム（`'free' | 'pro'`）でユーザープランを管理する。

---

## 5. 非機能要件

### 5.1 認証

- Supabase Auth（Email / Password）
- SSR対応: `@supabase/ssr` でサーバーサイドのセッション管理
- ミドルウェア（`src/proxy.ts`）で未認証ユーザーを `/login` へリダイレクト
- 将来: ソーシャルログイン（OAuth）追加予定枠を設けておく

### 5.2 レスポンシブ・プラットフォーム

- フェーズ1: モバイルファーストの Web アプリ（PWA 対応を念頭に置く）
- 将来: ネイティブアプリ化を予定。ビジネスロジックをコンポーネントから分離し移植しやすい設計にする
- ブレークポイント: Tailwind CSS デフォルト（sm: 640px, md: 768px 以上はデスクトップ表示）

### 5.3 パフォーマンス目安

| 項目 | 目安 |
|------|------|
| ページ初期表示（feed） | 2秒以内（LCP） |
| エントリ保存 → entry_detail 遷移 | 1秒以内（AI処理は非同期） |
| メンターチャット初回応答（TTFB） | 3秒以内 |
| Discover 更新（手動） | 10秒以内 |

### 5.4 画像・ファイル

- ストレージ: Supabase Storage（`entry-images` バケット）
- アップロード: クライアントから署名付きURL（`createSignedUrl`）で直接アップロード
- アクセス制御: RLS により自分の画像のみ取得可能

### 5.5 AI モデル

- 全 AI 処理で `claude-haiku-4-5-20251001` を使用（コスト効率優先）
- API キー: `ANTHROPIC_API_KEY`（`.env.local`）
- ストリーミング: メンターチャットのみ `streamText()`、その他は非ストリーミング

### 5.6 セキュリティ

- Supabase RLS を全テーブルに適用（`user_id = auth.uid()` を基本ポリシー）
- `mentor_templates` / `discover_item_types` / `discover_categories` は全認証ユーザーが SELECT 可、INSERT/UPDATE/DELETE はサービスロールのみ
- フィーチャーフラグは Middleware でサーバーサイド検証

---

## 6. 受け入れ条件

### Auth
- [ ] メールアドレス・パスワードで新規登録ができる
- [ ] ログイン・ログアウトが正常に動作する
- [ ] パスワードリセットメールが送信される
- [ ] 未認証状態で保護ルートにアクセスすると `/login` へリダイレクトされる

### feed
- [ ] Chain が時系列グループとして正しく表示される
- [ ] Chain 末尾の `+` から新エントリを作成すると、同 Chain にぶら下がる
- [ ] 「メンターに相談する」から作成した Thread が同 Chain に表示される
- [ ] Reflection Suggestion が最大3件表示され、クリックで既読マークが付く
- [ ] 検索モーダルが開き、フリーワード・type フィルタで絞り込める

### entry_write
- [ ] 本文を入力して保存すると entry_detail へ遷移する
- [ ] 「質問をもらう」でAI問いかけが生成・表示される
- [ ] 画像を添付して保存すると entry_detail に表示される
- [ ] 音声入力で話した内容がテキストエリアに挿入される
- [ ] `chain_id` を引き継いで開いた場合、保存後に同 Chain にエントリが追加される

### entry_detail
- [ ] AI生成コンテンツ（サマリ・タグ・解釈・気の利く情報）が保存後に表示される
- [ ] 生成中はスケルトン表示され、完了後に自動更新される
- [ ] 関連エントリリンクが最大2件表示され、遷移できる
- [ ] エラー時に「再試行」ボタンが表示される

### mentor
- [ ] mentor_add から3種（カスタム / AI提案 / テンプレート）でメンターを登録できる
- [ ] mentor_top に登録済みメンターが表示され、押下でチャットが開始できる
- [ ] チャット履歴が Supabase に保存され、再訪問時に復元される
- [ ] 「過去」ボタンで同 Chain の Entry のみに絞った feed へ遷移できる
- [ ] メンターの削除・並び替え・プロンプト編集ができる

### discover
- [ ] バッチ生成されたレコメンドが discover_detail に表示される
- [ ] 「更新」で新しいレコメンドが生成される
- [ ] Like ボタンでアイテムが保存され、discover_top の Likes一覧に表示される
- [ ] タイプ・カテゴリフィルタが動作する

### setting
- [ ] メールアドレス・パスワードが変更できる
- [ ] 利用プランが表示される
- [ ] 表示設定（フォントサイズ・言語）が保存・反映される

### フィーチャーフラグ
- [ ] `profiles.plan` が `'free'` のユーザーが全機能を利用できる
- [ ] `PLAN_FEATURES` の値を `'pro'` に変更すると対象 API が 403 を返す
