# dumpitAI

**기존 dumpit과 별개의 AI 웹앱** — 생각을 입력하면 Gemini가 프로젝트·할일·일정·메모로 자동 분류합니다.

> dumpit(기존)과 Supabase·Vercel·GitHub 저장소가 **완전히 분리**됩니다.  
> 신규 인프라 설정: **[SETUP.md](./SETUP.md)** ← 여기부터 시작

## 기술 스택

- Next.js 15, Tailwind CSS, Supabase, Google Gemini

## 빠른 시작

```bash
# 1. SETUP.md 따라 Supabase dumpitAI 프로젝트 생성
# 2. 환경 변수 설정
cp .env.example .env.local   # 새 Supabase + Gemini 키 입력

npm install
npm run dev
```

- 로컬: http://localhost:3000
- AI Inbox: http://localhost:3000/inbox

## 프로젝트 구조 (dumpit 대비)

| dumpit | dumpitAI |
|--------|----------|
| 키워드 자동 분류 | **Gemini AI 분류** |
| 홈 빠른 입력 | **AI Inbox** (`/inbox`) |
| 동일 | 메모·할일·일정·보드·여행 |

## 문서

- **[SETUP.md](./SETUP.md)** — Supabase + Vercel + GitHub 분리 설정
- [DEPLOY.md](./DEPLOY.md) — Vercel 배포 요약
- [DESIGN.md](./DESIGN.md) — 제품 설계 (dumpit 기반)

## DB 스키마

신규 Supabase에 `supabase/schema.sql` 한 번 실행 (001~008 포함).
