// 本番データベースを検索・変更するスクリプト（管理用）。
//
//   node scripts/prod-sql.js "SELECT ..." [--limit 200]          読み取り（既定。何も変更されない）
//   node scripts/prod-sql.js "UPDATE ..." --dry-run              変更を試して、結果を表示したあと取り消す
//   node scripts/prod-sql.js "UPDATE ..." --write                変更を確定する
//
// 接続先は、プロジェクト直下の .env.production.local の DATABASE_URL_PROD（gitに入らない）。
// - SELECT/WITH の検索は、常に読み取り専用のトランザクションで実行する。
// - それ以外（UPDATE/INSERT/DELETE など）は、--write か --dry-run を付けないと実行されない。
// - 文は1つだけ（; は使えない）。DROP / TRUNCATE / ALTER / GRANT などの構造変更は、このスクリプトでは実行できない（マイグレーションで行う）。
// 暗号化されている列（顧客の個人情報・パスワード管理）は、暗号文のまま。復号用の鍵は使わない。

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function loadUrl() {
  const file = path.join(__dirname, "..", ".env.production.local");
  if (!fs.existsSync(file)) throw new Error(".env.production.local がありません（DATABASE_URL_PROD=\"接続文字列\" の1行を保存してください）");
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL_PROD="));
  const url = line && line.slice("DATABASE_URL_PROD=".length).trim().replace(/^["']|["']$/g, "");
  if (!url) throw new Error(".env.production.local に DATABASE_URL_PROD がありません");
  return url;
}

function parseArgs(argv) {
  let limit = 200;
  let write = false;
  let dryRun = false;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") limit = Math.max(1, Math.min(5000, Number(argv[++i]) || 200));
    else if (argv[i] === "--write") write = true;
    else if (argv[i] === "--dry-run") dryRun = true;
    else rest.push(argv[i]);
  }
  return { sql: rest.join(" ").trim().replace(/;+\s*$/, ""), limit, write, dryRun };
}

const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? Number(x) : x), 2);

async function main() {
  const { sql, limit, write, dryRun } = parseArgs(process.argv.slice(2));
  if (!sql) throw new Error('使い方: node scripts/prod-sql.js "SELECT ..." [--limit 200] / "UPDATE ..." --dry-run / --write');
  if (sql.includes(";")) throw new Error("文は1つだけ指定してください（; は使えません）");
  if (write && dryRun) throw new Error("--write と --dry-run は同時に指定できません");

  const isSelect = /^(select|with)\b/i.test(sql);
  if (!isSelect) {
    if (!/^(insert|update|delete)\b/i.test(sql)) throw new Error("実行できるのは SELECT / WITH / INSERT / UPDATE / DELETE だけです（構造の変更はマイグレーションで行います）");
    if (!write && !dryRun) throw new Error("変更を伴う文には --dry-run（試して取り消す）か --write（確定する）が必要です");
  }

  const prisma = new PrismaClient({ datasourceUrl: loadUrl() });
  try {
    if (isSelect) {
      const rows = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        return tx.$queryRawUnsafe(`SELECT * FROM (${sql}) AS q LIMIT ${limit + 1}`);
      });
      const truncated = rows.length > limit;
      const out = truncated ? rows.slice(0, limit) : rows;
      console.log(json(out));
      console.error(`${out.length}件${truncated ? `（上限${limit}件で打ち切り。--limit で変更できます）` : ""}`);
      return;
    }

    const ROLLBACK = "__dry_run_rollback__";
    try {
      const affected = await prisma.$transaction(async (tx) => {
        const n = await tx.$executeRawUnsafe(sql);
        if (dryRun) {
          console.log(json({ dryRun: true, affectedRows: n }));
          console.error(`（試験実行）${n}件が対象です。変更は取り消しました。確定するには --write を付けて実行してください。`);
          throw new Error(ROLLBACK);
        }
        return n;
      });
      console.log(json({ committed: true, affectedRows: affected }));
      console.error(`${affected}件を変更しました。`);
    } catch (e) {
      if (!(e && e.message && e.message.includes(ROLLBACK))) throw e;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("エラー：" + (e && e.message ? e.message : e));
  process.exit(1);
});
