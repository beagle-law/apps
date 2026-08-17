"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import type { Invoice } from "@/lib/types";
import { invoiceTotal } from "@/lib/business/invoice";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import * as api from "@/lib/api-client";

interface Props {
  caseId: string;
  refreshKey: number;
  onError: (msg: string) => void;
}

export default function InvoiceListForCase({ caseId, refreshKey, onError }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    api.fetchInvoices(caseId).then(setInvoices).catch((e) => onError(e instanceof Error ? e.message : "請求書の取得に失敗しました"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, refreshKey]);

  const togglePaid = async (inv: Invoice) => {
    try {
      const updated = await api.markInvoicePaid(inv.id, !inv.paid);
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      onError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const downloadPdf = async (inv: Invoice) => {
    try {
      await downloadInvoicePdf(inv);
    } catch (e) {
      onError(e instanceof Error ? e.message : "PDFの作成に失敗しました");
    }
  };

  const removeInvoice = async (id: string) => {
    try {
      await api.deleteInvoice(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      onError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  if (invoices.length === 0) return null;

  return (
    <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${COLORS.brassLight}` }}>
      <p className="text-xs font-bold mb-2" style={{ color: COLORS.slate }}>この案件の請求書</p>
      <div className="flex flex-col gap-2">
        {invoices.map((inv) => {
          const totals = invoiceTotal(inv);
          return (
            <div key={inv.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded" style={{ backgroundColor: COLORS.paper }}>
              <div className="flex-1">
                <p>No.{inv.invoiceNumber}　{formatDate(inv.issueDate)}　¥{totals.total.toLocaleString("ja-JP")}</p>
              </div>
              <button onClick={() => togglePaid(inv)} className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ color: "#fff", backgroundColor: inv.paid ? COLORS.moss : COLORS.slate }}>
                {inv.paid ? "入金済み" : "未入金"}
              </button>
              <button onClick={() => downloadPdf(inv)} className="flex-shrink-0" style={{ color: COLORS.navy }} title="PDFをダウンロード">
                <Download size={14} />
              </button>
              <button onClick={() => removeInvoice(inv.id)} style={{ color: COLORS.slate }} className="flex-shrink-0"><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
