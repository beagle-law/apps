"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Loader2 } from "lucide-react";
import { COLORS, FONT_GOTHIC, FONT_MINCHO } from "@/lib/constants";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "ログインに失敗しました");
        return;
      }
      const next = searchParams.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: COLORS.paper, fontFamily: FONT_GOTHIC, color: COLORS.ink }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded p-8 flex flex-col gap-5"
        style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.brassLight}` }}
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <div
            className="w-14 h-14 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: COLORS.brass, color: COLORS.brass, transform: "rotate(-6deg)" }}
          >
            <Briefcase size={24} />
          </div>
          <h1 className="text-lg mt-1" style={{ fontFamily: FONT_MINCHO, letterSpacing: "0.05em" }}>
            案件進捗管理
          </h1>
          <p className="text-xs" style={{ color: COLORS.slate }}>
            事務所共通パスワードでログインしてください
          </p>
        </div>

        <label className="text-xs" style={{ color: COLORS.slate }}>
          パスワード
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full text-sm p-2.5 rounded outline-none"
            style={{ border: `1px solid ${COLORS.brassLight}` }}
          />
        </label>

        {error && (
          <p className="text-xs" style={{ color: COLORS.vermillion }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!password || loading}
          className="flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded transition disabled:opacity-40"
          style={{ backgroundColor: COLORS.navy, color: "#fff" }}
        >
          {loading && <Loader2 className="animate-spin" size={15} />}
          ログイン
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
