# Dumpit

한 줄 입력으로 메모·할일·일정을 자동 분류하는 스마트 웹앱.

## 기술 스택

- **Frontend:** Next.js 15, Tailwind CSS
- **Backend:** Supabase (Auth + PostgreSQL + RLS)
- **배포:** Vercel

## 시작하기

### 1. Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/001_initial_schema.sql` 실행
3. Authentication → Email 활성화

### 2. 환경 변수

```bash
cp .env.example .env.local
```

`.env.local`에 Supabase URL과 publishable key 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

> 신규 프로젝트는 `publishable key`만 제공됩니다. 예전 `anon key`도 동일 변수 자리에 넣으면 됩니다 (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).

### 3. 실행

```bash
npm install
npm run dev
```

http://localhost:3000 에서 확인

## 다른 기기에서 사용하기 (배포)

공개 URL로 휴대폰·태블릿에서 접속하려면 Vercel에 배포하세요.

**상세 가이드:** [DEPLOY.md](./DEPLOY.md)

요약:

1. Supabase에 마이그레이션 적용 + Auth Redirect URL 설정
2. GitHub에 코드 push
3. [Vercel](https://vercel.com)에서 프로젝트 import
4. 환경 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 설정
5. 배포된 URL을 휴대폰에서 열기 (홈 화면에 추가 가능)

## 문서

- [DESIGN.md](./DESIGN.md) — 제품 설계
- [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) — 개발 계획서

## 주요 기능

- 한 줄 입력 + 키워드 기반 자동 분류 (타입 / 카테고리 / 마감일)
- 기본 카테고리 10개 (가입 시 자동 생성)
- 카테고리 CRUD + 키워드 학습
- Today / 카테고리별 / 완료 뷰
- Todo·일정 완료 체크

## Cursor 워크스페이스

폴더명이 `snapstory` → `dumpit`으로 변경되었습니다.  
Cursor에서 **File → Open Folder → dumpit** 으로 폴더를 다시 열어주세요.
