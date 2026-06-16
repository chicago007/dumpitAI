"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function formatAuthError(message: string) {
  if (message.toLowerCase().includes("email not confirmed")) {
    return "이메일 인증이 필요합니다. 가입 시 받은 메일의 링크를 클릭한 뒤 다시 로그인해 주세요.";
  }
  if (message.includes("otp_expired")) {
    return "인증 링크가 만료되었습니다. 회원가입을 다시 하거나 새 인증 메일을 요청해 주세요.";
  }
  if (message.includes("access_denied")) {
    return "인증에 실패했습니다. 링크를 다시 확인하거나 다시 로그인해 주세요.";
  }
  if (message.includes("auth_callback_failed")) {
    return "이메일 인증 처리에 실패했습니다. 다시 로그인해 주세요.";
  }
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(formatAuthError(authError.message));
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Dumpit</h1>
          <p className="mt-1 text-sm text-slate-500">로그인</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-brand-600 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
