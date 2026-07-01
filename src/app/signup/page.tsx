"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_TAGLINE } from "@/lib/app-brand";
import { AppBrandTitle } from "@/components/layout/app-brand-title";
import { hasSupabaseClientEnv } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAuthError } from "@/lib/auth-errors";

const ENV_ERROR =
  "Supabase 연결 설정이 없습니다. .env.local에 Supabase URL과 키를 설정해 주세요.";

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
        setError(formatAuthError(authError));
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
      setError(formatAuthError(err instanceof Error ? err : String(err)));
      setLoading(false);
    }
  }

  return (
    <div
      data-theme="default"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            <AppBrandTitle versionClassName="text-slate-400" />
          </h1>
          <p className="mt-1 text-sm text-slate-500">{APP_TAGLINE}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            disabled={!envReady || loading}
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            required
            minLength={6}
            disabled={!envReady || loading}
            className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
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
          <Button
            type="submit"
            disabled={!envReady || loading}
            className="w-full bg-slate-900 text-white hover:bg-slate-800"
            size="lg"
          >
            {loading ? "가입 중..." : "회원가입"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
