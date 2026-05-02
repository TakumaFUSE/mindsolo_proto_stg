---
description: Start a new development phase with a fresh branch
argument-hint: <phase-number> <phase-slug>  例: 3 data-model
---

新しいフェーズを開始します。引数: $ARGUMENTS

以下を順番に実行:
1. git status を確認。未コミットの変更があれば中断して報告
2. git checkout main && git pull --ff-only origin main （リモートが無ければ pull はスキップ）
3. 引数を「<番号> <スラッグ>」としてパースし、feat/phase-<番号>-<スラッグ> ブランチを作成して切り替え
4. CLAUDE.md 冒頭の "## 現在のフェーズ" セクションを更新（無ければ「## このリポジトリの方針」直後に追加）
   形式は1行で: "- Phase <番号>: <スラッグ> (開始 YYYY-MM-DD)"
5. CLAUDE.md を commit (chore: start phase <番号>)
6. 現在のブランチ名と "Phase <番号> 開始準備完了" を1行で報告
