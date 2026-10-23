import { prisma } from "@/lib/prisma";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { serializeClient } from "@/lib/client-query";
import { serializePasswordEntry } from "@/lib/password-query";
import { invoiceInclude, serializeInvoice } from "@/lib/invoice-query";

/**
 * v37：自動バックアップ用に、アプリ内の全データ（文字・数字のデータ）を1つのオブジェクトにまとめる。
 *
 * ・顧客情報・パスワードは復号した平文で含める（保存先のフォルダは、アクセス権を制限している前提）
 * ・次のものは含めない
 *   - 添付された画像・ファイルの本体（メモ・ノウハウの画像、ひながたのファイル）。メタ情報（名前・サイズ）のみ
 *   - 各メンバーの「個人メモ」（本人以外は閲覧できない設計のため）
 *   - ログイン用のパスワードのハッシュ（復元時は、ユーザーのパスワードを再設定する）
 */
export async function buildFullBackup() {
  const [
    cases,
    clients,
    timeCharges,
    attendance,
    dailyReports,
    passwordCategories,
    passwordEntries,
    goalRecords,
    knowhowEntries,
    templates,
    invoices,
    classifications,
    monthlyNotes,
    moneyCards,
    users,
    auditLogs,
  ] = await Promise.all([
    prisma.case.findMany({ where: { isPrivate: false }, include: caseInclude }),
    prisma.client.findMany(),
    prisma.timeCharge.findMany(),
    prisma.attendanceRecord.findMany({ include: { extraSegments: true } }),
    prisma.dailyReport.findMany(),
    prisma.passwordCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.passwordEntry.findMany(),
    prisma.goalRecord.findMany({ include: { items: true } }),
    prisma.knowhowEntry.findMany({ include: { images: true } }),
    prisma.template.findMany(),
    prisma.invoice.findMany({ include: invoiceInclude }),
    prisma.caseClassification.findMany(),
    prisma.monthlyNote.findMany(),
    prisma.moneyCard.findMany(),
    prisma.user.findMany({ select: { id: true, loginId: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    note: "添付ファイルの本体・各メンバーの個人メモ・ログイン用パスワードのハッシュは含まれません。顧客情報・パスワード管理のデータは平文です。",
    cases: cases.map(serializeCase),
    clients: clients.map(serializeClient),
    timeCharges,
    attendance,
    dailyReports,
    passwordCategories,
    passwordEntries: passwordEntries.map(serializePasswordEntry),
    goalRecords,
    knowhowEntries,
    templates,
    invoices: invoices.map(serializeInvoice),
    caseClassifications: classifications,
    monthlyNotes,
    moneyCards,
    users,
    auditLogs,
  };

  const counts = {
    cases: data.cases.length,
    clients: data.clients.length,
    timeCharges: timeCharges.length,
    attendance: attendance.length,
    dailyReports: dailyReports.length,
    passwordEntries: passwordEntries.length,
    invoices: invoices.length,
    users: users.length,
  };
  return { data, counts };
}

/** 日本時間の日付（YYYY-MM-DD）。ファイル名と保存期間の判定に使う。 */
export function jstDate(d: Date = new Date()): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const BACKUP_FILE_PREFIX = "beagle-backup_";
export const backupFileName = (d: Date = new Date()) => `${BACKUP_FILE_PREFIX}${jstDate(d)}.json`;
