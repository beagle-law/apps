// 本番データベースを「読み取り専用」で検索するスクリプト（分析・書き出し用）。
//
//   node scripts/ro-query.js "SELECT ..." [--limit 200]
//
// 接続先は、プロジェクト直下の .env.readonly の DATABASE_URL_READONLY（gitに入らない）。
// ここには、Neonで作った「読み取り専用のロール」の接続文字列だけを入れる（docs/読み取り専用ロールの作り方.md）。
// 安全のため、①SELECT/WITH の1文だけ受け付ける ②読み取り専用のトランザクションで実行する ③DB側の権限でも書き込めない、の三重にしている。
// 暗号化されている列（顧客の個人情報・パスワード管理）は、暗号文のまま返る（復号用の鍵は使わない）。

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function loadUrl() {
  const file = path.join(__dirname, "..", ".env.readonly");
  if (!fs.existsSync(file)) throw new Error(".env.readonly がありません（docs/読み取り専用ロールの作り方.md を参照）");
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL_READONLY="));
  const url = line && line.slice("DATABASE_URL_READONLY=".length).trim().replace(/^["']|["']$/g, "");
  if (!url) throw new Error(".env.readonly に DATABASE_URL_READONLY がありません");
  return url;
}

function parseArgs(argv) {
  let limit = 200;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit") limit = Math.max(1, Math.min(5000, Number(argv[++i]) || 200));
    else rest.push(argv[i]);
  }
  return { sql: rest.join(" ").trim().replace(/;+\s*$/, ""), limit };
}

async function main() {
  const { sql, limit } = parseArgs(process.argv.slice(2));
  if (!sql) throw new Error('使い方: node scripts/ro-query.js "SELECT ..." [--limit 200]');
  if (!/^(select|with)\b/i.test(sql)) throw new Error("SELECT または WITH で始まる検索だけ実行できます");
  if (sql.includes(";")) throw new Error("文は1つだけ指定してください（; は使えません）");

  const prisma = new PrismaClient({ datasourceUrl: loadUrl() });
  try {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return tx.$queryRawUnsafe(`SELECT * FROM (${sql}) AS q LIMIT ${limit + 1}`);
    });
    const truncated = rows.length > limit;
    const out = truncated ? rows.slice(0, limit) : rows;
    console.log(JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? Number(v) : v), 2));
    console.error(`${out.length}件${truncated ? `（上限${limit}件で打ち切り。--limit で変更できます）` : ""}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("エラー：" + (e && e.message ? e.message : e));
  process.exit(1);
});
