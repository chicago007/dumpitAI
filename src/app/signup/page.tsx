"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseClientEnv } from "@/lib/supabase/env";

function formatAuthError(message: string) {
  if (message.toLowerCase().includes("email not confirmed")) {
    return "이메일 인증이 필요합니다. 가입 시 받은 메일의 링크를 클릭한 뒤 다시 로그인해 주세요.";
  }
  return message;
}

const ENV_ERROR =
  "Supabase 연결 설정이 없습니다. Vercel에 환경 변수를 추가한 뒤 재배포해 주세요.";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [envReady, setEnvReady] = useState(true);

  useEffect(() => {
    if (!hasSupabaseClientEnv()) {
      setEnvReady(false);
      setError(ENV_ERROR);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!envReady) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(formatAuthError(authError.message));
        setLoading(false);
        return;
      }

      if (!data.session) {
        setSuccess(
          "가입이 완료되었습니다. 이메일로 온 인증 링크를 클릭한 뒤 로그인해 주세요.",
        );
        setLoading(false);
        return;
      }

      window.location.assign("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "회원가입에 실패했습니다.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Dumpit</h1>
          <p className="mt-1 text-sm text-slate-500">회원가입</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            disabled={!envReady || loading}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            required
            minLength={6}
            disabled={!envReady || loading}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700" role="status">
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={!envReady || loading}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-brand-600 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
