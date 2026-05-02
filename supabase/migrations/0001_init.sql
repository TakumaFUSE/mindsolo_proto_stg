-- =============================================================
-- editlife 初期スキーマ
-- 根拠: docs/DATA_MODEL.md
-- =============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- LIKE 全文検索フォールバック用

-- ── 共通 updated_at トリガー関数 ─────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── profiles ──────────────────────────────────────────────────
-- auth.users の拡張。signup トリガーで自動作成。
CREATE TABLE profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text        NOT NULL,
  plan          text        NOT NULL DEFAULT 'free'   CHECK (plan     IN ('free','pro')),
  font_size     text        NOT NULL DEFAULT 'normal' CHECK (font_size IN ('small','normal','large')),
  language      text        NOT NULL DEFAULT 'ja'     CHECK (language  IN ('ja','en')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- signup 時に profiles を自動作成
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── chains ────────────────────────────────────────────────────
-- Entry / Thread を束ねる時系列グループ。updated_at が feed のソートキー。
-- updated_at はアプリ側が Entry/Thread INSERT 後に明示更新する。
CREATE TABLE chains (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON chains (user_id, updated_at DESC);

-- ── entries ───────────────────────────────────────────────────
CREATE TABLE entries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id            uuid        NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  content             text        NOT NULL,
  image_urls          text[]      NOT NULL DEFAULT '{}',
  ai_status           text        NOT NULL DEFAULT 'pending'
                        CHECK (ai_status IN ('pending','processing','done','error')),
  summary             text,
  tags                text[]      NOT NULL DEFAULT '{}',
  interpretation      text,
  helpful_info        text,
  related_entry_ids   uuid[]      NOT NULL DEFAULT '{}',
  search_vector       tsvector,   -- AI 処理完了時にアプリが更新
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- feed: chain 内アイテム (created_at 昇順)
CREATE INDEX ON entries (chain_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- AI 処理キュー
CREATE INDEX ON entries (user_id, ai_status)
  WHERE ai_status IN ('pending','processing');

-- 有効エントリ一覧
CREATE INDEX ON entries (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 全文検索
CREATE INDEX ON entries USING GIN (search_vector);

-- pg_trgm を使った LIKE フォールバック（japanese 辞書未整備時）
CREATE INDEX ON entries USING GIN (content gin_trgm_ops);

-- Supabase Realtime: ai_status 変化を購読するために追加
ALTER PUBLICATION supabase_realtime ADD TABLE entries;

-- ── mentor_templates ──────────────────────────────────────────
-- 管理者管理のプリセット。認証ユーザーは SELECT のみ。
CREATE TABLE mentor_templates (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  description   text        NOT NULL,
  system_prompt text        NOT NULL,
  order_index   int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON mentor_templates (order_index);

-- ── user_mentors ──────────────────────────────────────────────
CREATE TABLE user_mentors (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source        text        NOT NULL
                  CHECK (source IN ('custom','ai_suggested','template')),
  template_id   uuid        REFERENCES mentor_templates(id) ON DELETE SET NULL,
  name          text        NOT NULL,
  description   text,
  system_prompt text        NOT NULL,
  order_index   int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_mentors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ON user_mentors (user_id, order_index);

-- ── mentor_threads ────────────────────────────────────────────
CREATE TABLE mentor_threads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id    uuid        NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  mentor_id   uuid        NOT NULL REFERENCES user_mentors(id) ON DELETE CASCADE,
  title       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON mentor_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ON mentor_threads (chain_id, created_at ASC);
CREATE INDEX ON mentor_threads (mentor_id, created_at DESC);

-- ── mentor_messages ───────────────────────────────────────────
CREATE TABLE mentor_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid        NOT NULL REFERENCES mentor_threads(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('user','assistant')),
  content     text        NOT NULL,
  image_urls  text[]      NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON mentor_messages (thread_id, created_at ASC);

-- ── reflection_suggestions ────────────────────────────────────
CREATE TABLE reflection_suggestions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 未読を先に、未読内は新しい順
CREATE INDEX ON reflection_suggestions (user_id, read_at NULLS FIRST, created_at DESC);

-- ── discover_item_types ───────────────────────────────────────
CREATE TABLE discover_item_types (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  order_index int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON discover_item_types (order_index);

-- ── discover_categories ───────────────────────────────────────
CREATE TABLE discover_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  order_index int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON discover_categories (order_index);

-- ── discover_recommendations ──────────────────────────────────
CREATE TABLE discover_recommendations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type_id    uuid        REFERENCES discover_item_types(id) ON DELETE SET NULL,
  category_id     uuid        REFERENCES discover_categories(id) ON DELETE SET NULL,
  title           text        NOT NULL,
  description     text        NOT NULL,
  tag             text        NOT NULL CHECK (tag IN ('just_for_you','expand')),
  affiliate_url   text,
  image_url       text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON discover_recommendations (user_id, item_type_id, created_at DESC);
CREATE INDEX ON discover_recommendations (user_id, category_id,   created_at DESC);

-- ── discover_likes ────────────────────────────────────────────
-- 非正規化カラムで元レコメンド削除後も Likes を保持する
CREATE TABLE discover_likes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id   uuid        REFERENCES discover_recommendations(id) ON DELETE SET NULL,
  title               text        NOT NULL,
  affiliate_url       text,
  item_type_id        uuid        REFERENCES discover_item_types(id) ON DELETE SET NULL,
  category_id         uuid        REFERENCES discover_categories(id) ON DELETE SET NULL,
  tag                 text        NOT NULL CHECK (tag IN ('just_for_you','expand')),
  liked_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON discover_likes (user_id, liked_at DESC);
CREATE INDEX ON discover_likes (user_id, item_type_id);
CREATE INDEX ON discover_likes (user_id, category_id);

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chains                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries                ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mentors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_threads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_item_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_likes         ENABLE ROW LEVEL SECURITY;

-- profiles: 自分のプロフィールのみ
CREATE POLICY "own profile" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- chains: 自分の chain のみ
CREATE POLICY "own chains" ON chains
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- entries: 自分のエントリのみ
CREATE POLICY "own entries" ON entries
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- mentor_templates: 認証ユーザーが SELECT のみ
CREATE POLICY "read templates" ON mentor_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- user_mentors: 自分のメンターのみ
CREATE POLICY "own mentors" ON user_mentors
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- mentor_threads: 自分のスレッドのみ
CREATE POLICY "own threads" ON mentor_threads
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- mentor_messages: スレッドの所有者チェック（間接）
CREATE POLICY "own messages" ON mentor_messages
  USING (
    EXISTS (SELECT 1 FROM mentor_threads t
            WHERE t.id = thread_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM mentor_threads t
            WHERE t.id = thread_id AND t.user_id = auth.uid())
  );

-- reflection_suggestions: 自分の提案のみ
CREATE POLICY "own suggestions" ON reflection_suggestions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- discover_item_types / discover_categories: 認証ユーザーが SELECT のみ
CREATE POLICY "read item types" ON discover_item_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "read categories" ON discover_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- discover_recommendations: 自分のレコメンドのみ
CREATE POLICY "own recommendations" ON discover_recommendations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- discover_likes: 自分の Likes のみ
CREATE POLICY "own likes" ON discover_likes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── シードデータ ──────────────────────────────────────────────

INSERT INTO discover_item_types (name, order_index) VALUES
  ('商品', 0),
  ('場所', 1),
  ('体験', 2);

INSERT INTO discover_categories (name, order_index) VALUES
  ('美術',     0),
  ('音楽',     1),
  ('海外旅行', 2);

INSERT INTO mentor_templates (name, description, system_prompt, order_index) VALUES
  (
    '内省の伴走者',
    '自分自身を深く理解したいあなたに',
    'あなたは穏やかで共感力の高いライフコーチです。ユーザーの言葉をそのまま受け止め、批判せず、本人が自分で答えを見つけられるよう問いを立てます。感情に寄り添いながら、内側にある本音を引き出してください。',
    0
  ),
  (
    '行動の触媒',
    '考えを行動に変えたいあなたに',
    'あなたは実践的で前向きなメンターです。ユーザーの思考を整理し、具体的な次の一歩を一緒に考えます。できる・できないではなく「何から始めるか」に焦点を当て、小さな行動を後押ししてください。',
    1
  ),
  (
    '好奇心の案内人',
    '新しい視点・知識・体験を探したいあなたに',
    'あなたは知的好奇心旺盛な探求者です。ユーザーの興味から連想を広げ、まだ知らない世界への扉を開きます。本・場所・人・考え方など幅広い視点からヒントを提示し、探索の楽しさを共有してください。',
    2
  );
