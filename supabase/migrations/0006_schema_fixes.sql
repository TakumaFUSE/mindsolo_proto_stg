-- Phase 8 schema fixes (companion to 0005)

-- entries.id に UUID DEFAULT を設定（legacy テーブルは DEFAULT なしで残っていた）
ALTER TABLE entries
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- custom_mentors.description を nullable に変更（フォームでは任意入力）
ALTER TABLE custom_mentors
  ALTER COLUMN description DROP NOT NULL;
