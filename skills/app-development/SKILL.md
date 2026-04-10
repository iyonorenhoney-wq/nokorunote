---
name: app-development
description: |
  アプリを作るとき、機能を追加するとき、バグを直すとき、
  「アプリ作って」「機能追加して」「動かない」などと言われたときに使う。
  Use when building apps, adding features, or debugging issues.
---

# アプリ開発スキル
## ～ ゼロからアプリを作る専門家 ～

---

## このスキルを使う場面
- 「〇〇アプリを作りたい」と言われたとき
- 新しい機能を追加するとき
- バグや動作不良を修正するとき
- 既存アプリをリファクタリングするとき

## このスキルを使わない場面
- Webサイト（見た目重視のLP・ブログ）の制作 → `website-builder` スキルを使う
- 単純なテキスト生成・翻訳タスク

---

## 手順（この順番で必ず実行する）

### Step 1：要件ヒアリング
ユーザーに以下を確認する（まとめて聞く、1問ずつ聞かない）：

```
確認事項：
1. このアプリで「何ができる」ようにしたいですか？
2. 使う人は誰ですか？（自分・チーム・お客さんなど）
3. 動かす場所はどこですか？（スマホ・PC・ブラウザなど）
4. 使いたい技術・ライブラリはありますか？（なければ「おまかせ」でOK）
```

### Step 2：設計（タスクリストの作成）
要件をもとに `task.md` を自動生成する：

```markdown
# アプリ名：○○

## 機能リスト
- [ ] 機能A
- [ ] 機能B
- [ ] 機能C

## 画面構成
- 画面1：〇〇画面
- 画面2：〇〇画面

## 技術スタック
- フロントエンド：〇〇
- バックエンド：〇〇（必要な場合）
- データ保存：〇〇

## 実装順序
1. まず最小限動くもの（MVP）を作る
2. 見た目を整える
3. 機能を追加する
4. テストして完成
```

### Step 3：MVP（最小動作版）の実装
- **一番コアな機能だけ**先に動かす
- 見た目は後回しでOK
- 動くことを最優先にする

```
実装の鉄則：
✅ まず動かす
✅ 次に動き続けるようにする  
✅ 最後に速くする・きれいにする
```

### Step 4：動作確認・デバッグ
- 実装後は必ずブラウザ/アプリで動作確認
- エラーが出たら：
  1. エラーメッセージをそのまま確認
  2. 原因を日本語で説明
  3. 修正方法を提示してから修正実行

### Step 5：機能追加・改善
- タスクリストのチェックを1つずつ入れていく
- 大きな変更は「変更前にバックアップを確認」する

---

## 技術選定ガイド（迷ったらこれ）

| 作りたいもの | おすすめ技術 |
|------------|------------|
| チャットボット | Python + Streamlit |
| Webアプリ（シンプル） | HTML + JavaScript |
| Webアプリ（本格） | Next.js + Vercel |
| データ分析ツール | Python + Streamlit |
| モバイルアプリ | React Native / Flutter |
| API | FastAPI（Python） |

---

## よく使うコードパターン

### パターン1：シンプルなチャットUI（Streamlit）
```python
import streamlit as st

st.title("AIチャットアプリ")

if "messages" not in st.session_state:
    st.session_state.messages = []

# チャット履歴を表示
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# ユーザー入力
if prompt := st.chat_input("メッセージを入力..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    # AIの返答をここに追加
    response = f"「{prompt}」ですね。承りました！"
    st.session_state.messages.append({"role": "assistant", "content": response})
    st.rerun()
```

### パターン2：シンプルなWebアプリ（HTML）
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>アプリ名</title>
    <style>
        body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        button { background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>アプリ名</h1>
    <div id="app">
        <!-- ここにコンテンツ -->
    </div>
    <script>
        // ここにロジック
    </script>
</body>
</html>
```

---

## 品質チェックリスト（完成前に確認）

```
□ エラーなく動作するか？
□ スマホでも見やすいか？（レスポンシブ）
□ APIキーなど秘密情報が露出していないか？
□ ユーザーが迷わず使えるか？（直感的なUI）
□ README.md を作成したか？
```
