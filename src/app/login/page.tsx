"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { COLORS, FONT_GOTHIC, FONT_MINCHO } from "@/lib/constants";
import * as api from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) return;
    setLoading(true);
    setError("");
    try {
      await api.login(loginId, password);
      const next = searchParams.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="w-14 h-14" style={{ opacity: 0.9 }} />
          <h1 className="text-lg mt-1" style={{ fontFamily: FONT_MINCHO, letterSpacing: "0.05em" }}>
            Beagle総合法律事務所
          </h1>
          <p className="text-xs" style={{ color: COLORS.slate }}>
            ログインIDとパスワードを入力してください
          </p>
        </div>

        <label className="text-xs" style={{ color: COLORS.slate }}>
          ログインID
          <input
            type="text"
            autoFocus
            autoComplete="username"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="mt-1 w-full text-sm p-2.5 rounded outline-none"
            style={{ border: `1px solid ${COLORS.brassLight}` }}
          />
        </label>

        <label className="text-xs" style={{ color: COLORS.slate }}>
          パスワード
          <input
            type="password"
            autoComplete="current-password"
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
          disabled={!loginId || !password || loading}
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
