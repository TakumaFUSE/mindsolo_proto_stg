-- =============================================================
-- editlife 初期スキーマ (idempotent 版)
-- 根拠: docs/DATA_MODEL.md
-- 0000_legacy_reconcile.sql が先に実行された場合に備え、
-- 全 CREATE TABLE / INDEX / POLICY を冪等化している。
-- =============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── 共通 updated_at トリガー関数 ─────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── profiles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text        NOT NULL,
  plan          text        NOT NULL DEFAULT 'free'   CHECK (plan     IN ('free','pro')),
  font_size     text        NOT NULL DEFAULT 'normal' CHECK (font_size IN ('small','normal','large')),
  language      text        NOT NULL DEFAULT 'ja'     CHECK (language  IN ('ja','en')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── chains ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chains (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chains_user_updated_idx
  ON chains (user_id, updated_at DESC);

-- ── entries ───────────────────────────────────────────────────
-- 0000 で journal_entries からリネーム済みの場合は IF NOT EXISTS でスキップ。
-- 新規環境ではここで作成される。
-- chain_id は 0000 経由の場合 nullable のまま（バックフィル後に制約追加）。
CREATE TABLE IF NOT EXISTS entries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id            uuid        REFERENCES chains(id) ON DELETE CASCADE,
  content             text        NOT NULL,
  image_urls          text[]      NOT NULL DEFAULT '{}',
  ai_status           text        NOT NULL DEFAULT 'pending'
                        CHECK (ai_status IN ('pending','processing','done','error')),
  summary             text,
  tags                text[]      NOT NULL DEFAULT '{}',
  interpretation      text,
  helpful_info        text,
  related_entry_ids   uuid[]      NOT NULL DEFAULT '{}',
  search_vector       tsvector,
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON entries;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS entries_chain_created_idx
  ON entries (chain_id, created_at ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS entries_user_ai_status_idx
  ON entries (user_id, ai_status)
  WHERE ai_status IN ('pending','processing');

CREATE INDEX IF NOT EXISTS entries_user_created_idx
  ON entries (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS entries_search_vector_idx
  ON entries USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS entries_content_trgm_idx
  ON entries USING GIN (content gin_trgm_ops);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE entries;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── mentor_templates ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_templates (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  description   text        NOT NULL,
  system_prompt text        NOT NULL,
  order_index   int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_templates_order_idx
  ON mentor_templates (order_index);

-- ── user_mentors ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_mentors (
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

DROP TRIGGER IF EXISTS set_updated_at ON user_mentors;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_mentors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS user_mentors_user_order_idx
  ON user_mentors (user_id, order_index);

-- ── mentor_threads ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_threads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chain_id    uuid        NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
  mentor_id   uuid        REFERENCES user_mentors(id) ON DELETE CASCADE,
  title       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON mentor_threads;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON mentor_threads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS mentor_threads_chain_created_idx
  ON mentor_threads (chain_id, created_at ASC);

CREATE INDEX IF NOT EXISTS mentor_threads_mentor_created_idx
  ON mentor_threads (mentor_id, created_at DESC);

-- ── mentor_messages ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid        NOT NULL REFERENCES mentor_threads(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('user','assistant')),
  content     text        NOT NULL,
  image_urls  text[]      NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mentor_messages_thread_created_idx
  ON mentor_messages (thread_id, created_at ASC);

-- ── reflection_suggestions ────────────────────────────────────
CREATE TABLE IF NOT EXISTS reflection_suggestions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     text        NOT NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reflection_suggestions_user_idx
  ON reflection_suggestions (user_id, read_at NULLS FIRST, created_at DESC);

-- ── discover_item_types ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS discover_item_types (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  order_index int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discover_item_types_order_idx
  ON discover_item_types (order_index);

-- ── discover_categories ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS discover_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  order_index int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discover_categories_order_idx
  ON discover_categories (order_index);

-- ── discover_recommendations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS discover_recommendations (
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

CREATE INDEX IF NOT EXISTS discover_rec_user_type_idx
  ON discover_recommendations (user_id, item_type_id, created_at DESC);

CREATE INDEX IF NOT EXISTS discover_rec_user_cat_idx
  ON discover_recommendations (user_id, category_id, created_at DESC);

-- ── discover_likes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discover_likes (
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

CREATE INDEX IF NOT EXISTS discover_likes_user_liked_idx
  ON discover_likes (user_id, liked_at DESC);

CREATE INDEX IF NOT EXISTS discover_likes_user_type_idx
  ON discover_likes (user_id, item_type_id);

CREATE INDEX IF NOT EXISTS discover_likes_user_cat_idx
  ON discover_likes (user_id, category_id);

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

-- DROP + CREATE パターンで冪等化
DO $$ BEGIN
  DROP POLICY IF EXISTS "own profile"        ON profiles;
  DROP POLICY IF EXISTS "own chains"         ON chains;
  DROP POLICY IF EXISTS "own entries"        ON entries;
  DROP POLICY IF EXISTS "read templates"     ON mentor_templates;
  DROP POLICY IF EXISTS "own mentors"        ON user_mentors;
  DROP POLICY IF EXISTS "own threads"        ON mentor_threads;
  DROP POLICY IF EXISTS "own messages"       ON mentor_messages;
  DROP POLICY IF EXISTS "own suggestions"    ON reflection_suggestions;
  DROP POLICY IF EXISTS "read item types"    ON discover_item_types;
  DROP POLICY IF EXISTS "read categories"    ON discover_categories;
  DROP POLICY IF EXISTS "own recommendations" ON discover_recommendations;
  DROP POLICY IF EXISTS "own likes"          ON discover_likes;
END $$;

CREATE POLICY "own profile" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "own chains" ON chains
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own entries" ON entries
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read templates" ON mentor_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "own mentors" ON user_mentors
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own threads" ON mentor_threads
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own messages" ON mentor_messages
  USING (
    EXISTS (SELECT 1 FROM mentor_threads t
            WHERE t.id = thread_id AND t.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM mentor_threads t
            WHERE t.id = thread_id AND t.user_id = auth.uid())
  );

CREATE POLICY "own suggestions" ON reflection_suggestions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read item types" ON discover_item_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "read categories" ON discover_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "own recommendations" ON discover_recommendations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own likes" ON discover_likes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── シードデータ（ON CONFLICT DO NOTHING で冪等）─────────────

INSERT INTO discover_item_types (name, order_index) VALUES
  ('商品', 0), ('場所', 1), ('体験', 2)
ON CONFLICT (name) DO NOTHING;

INSERT INTO discover_categories (name, order_index) VALUES
  ('美術', 0), ('音楽', 1), ('海外旅行', 2)
ON CONFLICT (name) DO NOTHING;

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
  )
ON CONFLICT DO NOTHING;
