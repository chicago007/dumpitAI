"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, APP_TAGLINE } from "@/lib/app-brand";
import { hasSupabaseClientEnv } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAuthError } from "@/lib/auth-errors";

const ENV_ERROR =
  "Supabase 연결 설정이 없습니다. Vercel에 환경 변수를 추가한 뒤 재배포해 주세요.";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [envReady, setEnvReady] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error");
    const errorCode = params.get("error_code");
    const errorDescription = params.get("error_description");

    if (urlError || errorCode || errorDescription) {
      const message = [errorCode, errorDescription, urlError]
        .filter(Boolean)
        .join(" ");
      setError(formatAuthError(message));
    }

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

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(formatAuthError(authError));
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{APP_NAME}</h1>
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
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            disabled={!envReady || loading}
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={!envReady || loading}
            className="w-full"
            size="lg"
          >
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
