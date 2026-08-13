import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { caseInclude, serializeCase } from "@/lib/case-query";
import { caseVisibilityFilter } from "@/lib/case-access";
import { serializeClient } from "@/lib/client-query";
import { serializePasswordEntry } from "@/lib/password-query";
import { invoiceInclude, serializeInvoice } from "@/lib/invoice-query";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const [cases, clients, timeCharges, dailyReports, passwordEntries, goalRecords, knowhowEntries, templates, invoices] =
    await Promise.all([
      prisma.case.findMany({ where: caseVisibilityFilter(user.id), include: caseInclude }),
      prisma.client.findMany(),
      prisma.timeCharge.findMany(),
      prisma.dailyReport.findMany(),
      prisma.passwordEntry.findMany(),
      prisma.goalRecord.findMany({ include: { items: true } }),
      prisma.knowhowEntry.findMany(),
      prisma.template.findMany(),
      prisma.invoice.findMany({ include: invoiceInclude }),
    ]);

  const body = {
    exportedAt: new Date().toISOString(),
    cases: cases.map(serializeCase),
    clients: clients.map(serializeClient),
    timeCharges: timeCharges.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
    dailyReports: dailyReports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    // パスワード管理データは復号済み（平文）で含まれます。取り扱いに十分ご注意ください。
    passwordEntries: passwordEntries.map(serializePasswordEntry),
    goalRecords,
    knowhowEntries,
    templates,
    invoices: invoices.map(serializeInvoice),
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Disposition": `attachment; filename="cenmozo-backup_${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
