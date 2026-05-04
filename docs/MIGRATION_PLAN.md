# MIGRATION_PLAN.md

DB migration plan for deploying the new mindsolo schema onto the legacy Supabase project.

---

## 1. Legacy → New table mapping

| Legacy table | New table | How |
|---|---|---|
| `journal_entries` | `entries` | Renamed by 0000 (RENAME TO) |
| `custom_mentors` | `custom_mentors` | Kept in place; `tone` column added in 0000 |
| `keyword_saves` | `keyword_saves_legacy_archive` | Renamed by 0000, not used in new app |
| `mentor_conversations` | `mentor_conversations_legacy_archive` | Renamed by 0000; data migrated into `mentor_threads` + `mentor_messages` by 0002 |
| *(new)* | `chains` | Created by 0001 |
| *(new)* | `mentor_templates` | Created by 0001 |
| *(new)* | `user_mentors` | Created by 0001 |
| *(new)* | `mentor_threads` | Created by 0001; `persona_id`/`is_builtin` added in 0002 |
| *(new)* | `mentor_messages` | Created by 0001 |
| *(new)* | `reflection_suggestions` | Created by 0001 |
| *(new)* | `discover_item_types` | Created by 0001 |
| *(new)* | `discover_categories` | Created by 0001 |
| *(new)* | `discover_recommendations` | Created by 0001 |
| *(new)* | `discover_likes` | Created by 0001 |
| *(new)* | `discover_cache` | Created by 0004 |

---

## 2. What each migration does

### 0000_legacy_reconcile.sql

Must run **before** 0001. Handles the existing data in the live DB:

1. Drops all RLS policies on `journal_entries`, then renames it to `entries`
2. Adds new columns to `entries` (`chain_id`, `ai_status`, `tags`, `interpretation`, `helpful_info`, `related_entry_ids`, `search_vector`, `topics`, `image_urls`, `deleted_at`)
3. Drops legacy-only columns (`keyword_matrix`, `emotion_analysis`, `latitude`, `longitude`, `location_label`)
4. Re-creates indexes and RLS on `entries` under the new name
5. Adds `tone` column to `custom_mentors` + re-creates RLS if missing
6. Renames `keyword_saves` → `keyword_saves_legacy_archive`
7. Renames `mentor_conversations` → `mentor_conversations_legacy_archive`

### 0001_init.sql

Creates all new tables, indexes, RLS policies, triggers, and seed data using `IF NOT EXISTS` / `DROP … IF EXISTS` guards so it is safe to run on both fresh and migrated DBs.

### 0002_mentor.sql

1. Creates `custom_mentors` (`IF NOT EXISTS`)
2. Adds `persona_id` and `is_builtin` to `mentor_threads` (`ADD COLUMN IF NOT EXISTS`)
3. Drops + re-creates the `mentor_threads_source_check` constraint
4. **Data migration**: loops over `mentor_conversations_legacy_archive`, creates one `chains` row + one `mentor_threads` row (is_builtin=true) + N `mentor_messages` rows per archived conversation

### 0003_topics_chain.sql

Adds `entries.topics` column (`ADD COLUMN IF NOT EXISTS`) and a covering index.

### 0004_discover_cache.sql

Creates `discover_cache` table, index, and RLS policies (all idempotent).

---

## 3. Running `supabase db push`

### Prerequisites

- Dashboard backup taken (Supabase → Settings → Database → Backups → Download)
- `supabase` CLI installed and logged in (`supabase login`)
- Local project linked: `supabase link --project-ref <ref>`

### Execution

```bash
# From repo root
supabase db push
```

Supabase tracks applied migrations in `supabase_migrations.schema_migrations`. Each file runs exactly once in filename order.

The expected order is:

```
0000_legacy_reconcile.sql   ← rename + reshape legacy tables
0001_init.sql               ← create new tables (IF NOT EXISTS)
0002_mentor.sql             ← persona columns + data migration
0003_topics_chain.sql       ← topics column
0004_discover_cache.sql     ← discover cache
```

---

## 4. Post-push backfill

After `supabase db push` completes, run the backfill script to populate `topics` and `chain_id` on pre-existing entries:

```bash
# Add SUPABASE_SERVICE_ROLE_KEY to app/.env.local (do not commit!)
# echo "SUPABASE_SERVICE_ROLE_KEY=<service-role-key>" >> app/.env.local

cd app

# Dry-run first to preview changes (topics already populated → --chain-only):
npx tsx scripts/backfill-existing-entries.ts --chain-only --dry-run

# Run for real:
npx tsx scripts/backfill-existing-entries.ts --chain-only
```

The script:
- Fetches entries where `chain_id IS NULL OR topics = '{}'` in batches of 50
- Extracts topics via Claude Haiku `tool_use`
- Assigns `chain_id` by looking for ≥2 overlapping topics in the past 30 days; creates a new chain if none match
- Continues on per-entry errors; exits non-zero if any failed
- Does not touch `deleted_at IS NOT NULL` entries

---

## 5. Archive table cleanup

**Phase 9-4 (2026-05-04) — 実施済み**

本番 DB で全画面動作確認（Phase 9-1〜9-3）完了後、以下を実施:

- バックアップ: `.backups/legacy_archives_20260504_211022.sql`（61 KB、3 テーブル分）
- 件数確認: `docs/legacy_archive_final_counts.sql` を実行して結果を保管
- migration `0009_drop_legacy_archives.sql` を `supabase db push` で適用

削除済みテーブル:

| テーブル | 備考 |
|---------|------|
| `keyword_saves_legacy_archive` | 0000 でリネーム後、新アプリから未使用 |
| `mentor_conversations_legacy_archive` | 0000 でリネーム後、0002 で `mentor_threads` / `mentor_messages` に移行済み |
| `user_mentors_legacy_archive` | 0007 でリネーム後、`custom_mentors` に統合済み |
| `journal_entries_legacy_archive` | 存在した場合の保険 DROP（0000 で `entries` にリネーム済み） |

---

## 6. Rollback procedure

If `supabase db push` or the backfill causes problems:

1. **Restore from Dashboard backup** (Supabase → Backups → Restore)  
   This is the safest option and covers all cases.

2. **Manual partial rollback** (only if the backup restore is not feasible):
   ```sql
   -- Undo 0000: reverse renames
   ALTER TABLE IF EXISTS entries RENAME TO journal_entries;
   ALTER TABLE IF EXISTS keyword_saves_legacy_archive RENAME TO keyword_saves;
   ALTER TABLE IF EXISTS mentor_conversations_legacy_archive RENAME TO mentor_conversations;
   -- Then drop any new tables added by 0001+
   DROP TABLE IF EXISTS discover_cache;
   DROP TABLE IF EXISTS discover_likes;
   DROP TABLE IF EXISTS discover_recommendations;
   DROP TABLE IF EXISTS discover_categories;
   DROP TABLE IF EXISTS discover_item_types;
   DROP TABLE IF EXISTS reflection_suggestions;
   DROP TABLE IF EXISTS mentor_messages;
   DROP TABLE IF EXISTS mentor_threads;
   DROP TABLE IF EXISTS user_mentors;
   DROP TABLE IF EXISTS mentor_templates;
   DROP TABLE IF EXISTS chains;
   ```

> ⚠ The manual rollback does **not** restore dropped columns (`keyword_matrix`, `emotion_analysis`, etc.) — use the Dashboard backup for full data recovery.
