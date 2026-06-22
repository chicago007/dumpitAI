import type { AuthError } from "@supabase/supabase-js";

export function formatAuthError(error: AuthError | Error | string): string {
  if (typeof error === "string") {
    return formatAuthMessage(error);
  }

  const message = "message" in error ? error.message?.trim() : "";
  if (!message || message === "{}") {
    const status = "status" in error ? error.status : undefined;
    if (status === 500) {
      return (
        "가입 처리 중 DB 오류가 발생했습니다. " +
        "Supabase SQL Editor에서 supabase/migrations/008_inbox_logs.sql 하단(가입 트리거) 부분을 실행해 주세요."
      );
    }
    return "인증에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return formatAuthMessage(message);
}

function formatAuthMessage(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes("email not confirmed")) {
    return "이메일 인증이 필요합니다. 가입 시 받은 메일의 링크를 클릭한 뒤 다시 로그인해 주세요.";
  }
  if (message.includes("Database error saving new user")) {
    return (
      "가입 처리 중 DB 오류가 발생했습니다. " +
      "Supabase SQL Editor에서 supabase/schema.sql 또는 migrations/008 하단을 실행해 주세요."
    );
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
  if (lower.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (lower.includes("user already registered")) {
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  }
  if (lower.includes("password")) {
    return "비밀번호는 6자 이상이어야 합니다.";
  }

  return message;
}
