# 案件進捗管理（法律事務所向け 案件管理アプリ）

Next.js（App Router） + PostgreSQL（Prisma）で構築した、法律事務所向けの案件管理Webアプリです。
事務所共通の1つのパスワードでログインし、複数人で同じ案件の進捗・タスク・期日を共有できます。

## 技術構成

- Next.js 15（App Router / TypeScript）
- PostgreSQL + Prisma ORM
- 認証：事務所共通パスワード＋署名付きセッションCookie（個人アカウントなし）
- UI：プロトタイプ（`legal-case-tracker.jsx`）のデザイン・データ構造を踏襲

## 1. ローカル環境のセットアップ

### 1-1. 前提

- Node.js 20以上
- PostgreSQL（ローカルにインストール済み、または接続先のURLがあること）

### 1-2. 依存関係のインストール

```bash
npm install
```

### 1-3. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、値を設定してください。

```bash
cp .env.example .env
```

| 変数名 | 説明 |
|---|---|
| `DATABASE_URL` | PostgreSQLの接続文字列 |
| `APP_PASSWORD` | 事務所共通のログインパスワード |
| `SESSION_SECRET` | セッションCookie署名用のランダムな秘密鍵（`openssl rand -hex 32` などで生成） |

### 1-4. データベースのマイグレーション

```bash
npx prisma migrate dev --name init
```

初回実行時にテーブルが作成され、`prisma/seed.ts` のサンプルデータ（案件2件）が自動投入されます。
サンプルデータを入れたくない場合は、投入後に「すべてのデータを削除」をアプリ内から実行してください。

### 1-5. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセスし、`.env` に設定した `APP_PASSWORD` でログインしてください。

## 2. データモデル

`prisma/schema.prisma` に定義。要件定義書のデータモデルに対応する形で、`Case` を中心に `Hearing`（期日）・`CaseTask`（タスク）・`Question`（質問）・`CaseDocument`（提出書類）・`UpdateLog`（経過記録）を関連テーブルとして保持しています。

## 3. 認証について

- ユーザーごとのアカウントは作成せず、事務所で1つのパスワード（`APP_PASSWORD`）を共有します。
- ログイン後は署名付きセッションCookie（90日間有効）で状態を保持するため、毎回パスワード入力は不要です。
- 各操作の「記入者」欄は、画面右上の「あなたの名前」欄に入力した名前が使われます（認証情報ではなく、経過記録の記名用です）。
- 本番環境ではHTTPS必須です（Vercelにデプロイする場合は自動的にHTTPSになります）。

## 4. Vercelへのデプロイ手順

### 4-1. 本番用データベースを用意する

ローカルのPostgresはVercelのサーバーレス環境から直接は使えないため、ホスティング型のPostgresを用意します。小規模利用（3名程度）であれば無料枠で十分です。

- [Neon](https://neon.tech)（推奨・無料枠あり）
- [Supabase](https://supabase.com)
- Vercel Postgres（Vercelのダッシュボードから直接作成可）

作成後、接続文字列（`postgresql://...`）を控えてください。

### 4-2. GitHubリポジトリにpushする

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <あなたのリポジトリURL>
git push -u origin main
```

### 4-3. Vercelでプロジェクトを作成

1. [vercel.com](https://vercel.com) で「Add New Project」からこのリポジトリをインポート
2. Framework Preset は自動で「Next.js」が検出されます
3. 「Environment Variables」に以下を設定
   - `DATABASE_URL`：4-1で取得した接続文字列
   - `APP_PASSWORD`：本番用の事務所共通パスワード（ローカルとは別の値を推奨）
   - `SESSION_SECRET`：本番用のランダムな秘密鍵（ローカルとは別の値を推奨）
4. 「Deploy」を実行

### 4-4. マイグレーションを本番DBに適用

初回デプロイ後、ローカルから本番DBに向けてマイグレーションを適用します。

```bash
# .env.production のような別ファイルに本番のDATABASE_URLを設定し、
DATABASE_URL="<本番のDATABASE_URL>" npx prisma migrate deploy
```

以降、スキーマを変更した場合は `npx prisma migrate dev` でローカルにマイグレーションファイルを作成し、コミット・pushしたうえで、上記コマンドで本番に適用してください（`vercel.json` の buildCommand に組み込んで自動化することも可能です）。

### 4-5. 独自ドメイン・バックアップ

- 独自ドメインはVercelのプロジェクト設定から追加できます
- バックアップはNeon/Supabase側の自動バックアップ機能を有効化しておくことを推奨します

## 5. 運用に関する留意点（法的助言ではありません）

依頼者情報・事件情報という機密性の高いデータを扱うため、データの保存場所やアクセス管理について、個人情報保護法や弁護士の守秘義務との関係を事務所内でご確認ください。本書はあくまで技術的な手順の説明であり、法的な適合性の判断は専門家にご確認ください。
