---
name: website-builder
description: |
  Webサイト・LP・ポートフォリオ・ブログなどを作るとき、
  「サイト作って」「LP作りたい」「ホームページ」などと言われたときに使う。
  Use when creating websites, landing pages, portfolios, or blogs.
---

# Webサイト構築スキル
## ～ 見栄えのするWebサイトを爆速で作る専門家 ～

---

## このスキルを使う場面
- LP（ランディングページ）を作るとき
- ポートフォリオサイトを作るとき
- コーポレートサイト・紹介ページを作るとき
- ブログ・メディアサイトを作るとき

## このスキルを使わない場面
- ユーザーが操作する動的アプリ → `app-development` スキルを使う
- データ処理・API開発

---

## 手順（この順番で必ず実行する）

### Step 1：デザイン要件ヒアリング
ユーザーに以下を確認する（まとめて聞く）：

```
確認事項：
1. サイトの目的は何ですか？
   （例：商品紹介・自己PR・問い合わせ獲得など）
2. ターゲットは誰ですか？
   （例：20〜30代の会社員・経営者・学生など）
3. 好きなデザインのサイトを1〜2個教えてください
   （なければ「シンプル・プロフェッショナル・かわいい」など雰囲気で）
4. 必要なページ・セクションは？
   （例：ヒーロー・機能紹介・料金・お問い合わせなど）
5. カラーの希望はありますか？
   （なければカラーパレットを提案します）
```

### Step 2：サイト構成の提案
要件をもとに構成を提案する：

```markdown
## サイト構成案

### ページ構成
- [ ] ヒーローセクション（一番上・キャッチコピー）
- [ ] 特徴/メリットセクション（3〜4個）
- [ ] 実績/事例セクション
- [ ] 料金セクション（必要なら）
- [ ] お問い合わせセクション
- [ ] フッター

### デザイン方針
- カラー：メイン#○○○○ / アクセント#○○○○
- フォント：見出し○○ / 本文○○
- スタイル：○○系（シンプル/モダン/温かみなど）

### 技術選定
- 静的サイト（シンプル）：HTML + CSS + JavaScript
- コンテンツ更新あり：Next.js + Vercel
- ブログ：Astro + Vercel
```

### Step 3：HTMLスケルトンの作成
まず構造だけを作り、確認してもらう：

```html
<!-- 構造確認用のスケルトン -->
<header>ナビゲーション</header>
<section id="hero">ヒーロー</section>
<section id="features">特徴</section>
<section id="pricing">料金</section>
<section id="contact">お問い合わせ</section>
<footer>フッター</footer>
```

### Step 4：デザイン実装
- **モバイルファースト**で実装する（スマホ→PC順）
- CSS変数でカラーを管理する
- アニメーションは最小限（読み込み速度重視）

### Step 5：コンテンツ充実
- キャッチコピーを5パターン提案する
- 特徴・メリットは「読者の悩み→解決策→証拠」の順で書く
- CTAボタンのテキストは動詞で始める（「無料で試す」「今すぐ始める」）

### Step 6：公開準備
- 画像の最適化（重い画像は圧縮）
- メタタグ（SEO・SNS共有）の設定
- デプロイ（Vercel/GitHub Pages など）

---

## デザインテンプレート

### カラーパレット例（コピペ用）

```css
/* プロフェッショナル系 */
:root {
    --color-primary: #1a1a2e;
    --color-accent: #4ade80;
    --color-text: #333333;
    --color-bg: #ffffff;
    --color-bg-secondary: #f8fafc;
}

/* 温かみ系 */
:root {
    --color-primary: #ff6b35;
    --color-accent: #ffd93d;
    --color-text: #2d2d2d;
    --color-bg: #fff8f0;
    --color-bg-secondary: #fef3c7;
}

/* テック系 */
:root {
    --color-primary: #6366f1;
    --color-accent: #22d3ee;
    --color-text: #1e293b;
    --color-bg: #0f172a;
    --color-bg-secondary: #1e293b;
}
```

### ヒーローセクション（コピペ用）
```html
<section id="hero" style="
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: linear-gradient(135deg, var(--color-primary), #0f3460);
    color: white;
    padding: 2rem;
">
    <div>
        <h1 style="font-size: clamp(2rem, 5vw, 4rem); margin-bottom: 1rem;">
            キャッチコピーをここに
        </h1>
        <p style="font-size: 1.2rem; opacity: 0.85; margin-bottom: 2rem;">
            サブコピー・説明文をここに
        </p>
        <a href="#contact" style="
            background: var(--color-accent);
            color: var(--color-primary);
            padding: 1rem 2.5rem;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            font-size: 1.1rem;
        ">
            今すぐ始める →
        </a>
    </div>
</section>
```

---

## コピーライティングの鉄則

```
❌ NG：「高品質なサービスを提供します」
✅ OK：「3ステップで、今日から使えるAIツールを作れます」

❌ NG：「お気軽にお問い合わせください」
✅ OK：「24時間以内にご連絡します。まずは無料相談を」

鉄則：
1. 数字を使う（「5分で」「3ステップで」「98%の人が」）
2. 読者の悩みから始める（「〇〇で困っていませんか？」）
3. CTAは1つに絞る（あれもこれもは逆効果）
```

---

## 品質チェックリスト

```
□ スマホで見やすいか？（実機またはDevTools確認）
□ 読み込み速度は速いか？（Lighthouse 90点以上）
□ CTAボタンがはっきり見えるか？
□ お問い合わせフォームが動作するか？
□ OGP（SNSでシェアした時の画像・タイトル）は設定したか？
□ GoogleAnalytics / アクセス解析は入れたか？
```
