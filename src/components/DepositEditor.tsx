"use client";

import { useState } from "react";
import { COLORS } from "@/lib/constants";
import { TextInput } from "@/components/ui";
import type { Deposit } from "@/lib/types";

interface Props {
  deposit: Deposit;
  /** 保存（失敗時は例外を投げる。成功したら呼び出し元が編集モードを閉じる） */
  onSave: (patch: { date: string; amount: number; notes: string }) => Promise<void>;
  onCancel: () => void;
}

// v28：預り金の入金の編集フォーム（経費入力画面・案件詳細で共通）。金額はプラスの数字。
export default function DepositEditor({ deposit, onSave, onCancel }: Props) {
  const [date, setDate] = useState(deposit.date);
  const [amount, setAmount] = useState(String(deposit.amount));
  const [notes, setNotes] = useState(deposit.notes);
  const [saving, setSaving] = useState(false);

  const valid = !!date && Number(amount) > 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({ date, amount: Number(amount), notes });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded w-full min-w-0" style={{ backgroundColor: COLORS.paper, border: `1px solid ${COLORS.brass}` }}>
      <p className="text-xs font-bold" style={{ color: COLORS.navy }}>預り金の入金を編集</p>
      <div className="flex gap-1.5 min-w-0">
        <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-0 flex-1" />
        <TextInput type="number" placeholder="入金額（プラス）" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-0 flex-1" />
      </div>
      <TextInput type="text" placeholder="メモ（任意）" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full" />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs px-2 py-1" style={{ color: COLORS.slate }}>キャンセル</button>
        <button onClick={save} disabled={!valid || saving} className="text-xs font-bold px-3 py-1.5 rounded disabled:opacity-40" style={{ backgroundColor: COLORS.navy, color: "#fff" }}>保存</button>
      </div>
    </div>
  );
}
