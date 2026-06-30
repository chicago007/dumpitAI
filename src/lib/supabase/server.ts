import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * 요청 단위로 메모이즈 — 같은 렌더/액션에서 createClient를 여러 번 불러도
 * 하나의 클라이언트(및 세션 캐시)를 재사용한다.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieOptions;
          }>,
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component — ignore
          }
        },
      },
    },
  );
});

/**
 * 요청 단위로 메모이즈된 사용자 조회. auth.getUser()는 매 호출마다
 * Supabase 인증 서버로 네트워크 검증을 보내므로, 같은 요청 안의 중복을 막는다.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
