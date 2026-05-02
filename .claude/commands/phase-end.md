---
description: Finalize current phase, log decisions to CLAUDE.md, optionally merge
argument-hint: <フェーズの一行要約>
---

現在のフェーズを終了します。引数: $ARGUMENTS

実行する前に、まず以下を私に提示して承認を取ること:
- 現在のブランチ名
- git log --oneline main..HEAD の出力
- CLAUDE.md に追記する内容（下記テンプレートで仮作成したもの）

承認後に実行:
1. このフェーズの成果を git log と git diff main..HEAD から読み取り、3〜5行の決定事項リストにまとめる（引数があれば最優先で反映）
2. CLAUDE.md の末尾に下記テンプレートに従って追記:

   見出し行: "## Phase <番号>: <スラッグ> (YYYY-MM-DD 完了)"
   その下に箇条書きで4行:
     - 決定事項1
     - 決定事項2
     - 決定事項3
     - 成果物: <主要ファイル列挙>

3. CLAUDE.md 冒頭の "## 現在のフェーズ" を "- (次のフェーズ未開始)" に書き換え
4. "docs: log phase <番号> completion" で commit
5. 私に2つ質問:
   - main にマージする? (Yes なら git checkout main && git merge --ff-only feat/...)
   - フェーズブランチを削除する? (Yes なら git branch -d feat/...)
6. 回答に従って実行
