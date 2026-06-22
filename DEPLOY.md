# dumpitAI 배포 (Vercel)

> **전체 설정(신규 Supabase·GitHub 분리 포함): [SETUP.md](./SETUP.md)**

## Vercel 환경 변수

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | dumpitAI Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | dumpitAI Publishable key |
| `GEMINI_API_KEY` | Google AI Studio 키 |
| `GEMINI_MODEL` | `gemini-2.0-flash` |

## 배포 후

Supabase Auth Redirect URL에 Vercel URL 추가 → `/inbox` 테스트

자세한 단계는 [SETUP.md](./SETUP.md) 참고.
