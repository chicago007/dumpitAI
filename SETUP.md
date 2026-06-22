# dumpitAI — 신규 인프라 설정 (Supabase + Vercel)

dumpitAI는 **기존 dumpit과 완전히 별개**의 프로젝트입니다.

| | dumpit (기존) | dumpitAI (신규) |
|---|---|---|
| 폴더 | `/Users/ybkim/projects/dumpit` | `/Users/ybkim/projects/dumpitAI` |
| GitHub | `chicago007/dumpit` | **`chicago007/dumpitAI`** (새 저장소) |
| Supabase | 기존 프로젝트 | **`dumpitAI`** (새 프로젝트) |
| Vercel | 기존 프로젝트 | **`dumpitAI`** (새 프로젝트) |

> dumpit 폴더·저장소·Supabase·Vercel은 **건드리지 않습니다.**

---

## 1단계: GitHub 저장소 분리

dumpitAI는 dumpit과 **같은 remote를 쓰면 안 됩니다.**

```bash
cd /Users/ybkim/projects/dumpitAI

# GitHub에서 chicago007/dumpitAI 새 저장소 생성 후:
git remote rename origin dumpit-legacy   # 기존 dumpit 연결 보존(선택)
git remote add origin https://github.com/chicago007/dumpitAI.git

git add .
git commit -m "dumpitAI: AI Inbox + Gemini"
git push -u origin smart-memo-agent:main
```

---

## 2단계: Supabase `dumpitAI` 새 프로젝트

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. **Name:** `dumpitAI`
3. Region: Seoul (또는 가까운 리전)
4. DB 비밀번호 저장

### 스키마 적용

**SQL Editor** → New query → 아래 파일 **전체** 붙여넣기 후 Run:

```
supabase/schema-agent-full.sql
```

### Authentication

- **Providers** → Email 활성화
- (개발용) Confirm email 끄기 가능

### API 키 복사

**Project Settings → API**

| 환경 변수 | 값 |
|-----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |

### `.env.local` 업데이트

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://<새-프로젝트-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

> **주의:** 기존 dumpit Supabase URL(`nqgfmusxwfucgahfqklf`)을 쓰면 안 됩니다.

---

## 3단계: 로컬 확인

```bash
npm install
npm run dev
```

1. http://localhost:3000 → 회원가입 (새 DB이므로 새 계정)
2. `/inbox` → AI 분석 테스트

---

## 4단계: Vercel `dumpitAI` 새 프로젝트

1. [vercel.com/new](https://vercel.com/new)
2. GitHub **`dumpitAI`** 저장소 import
3. **Project Name:** `dumpitAI`
4. **Root Directory:** `.` (기본값)
5. Framework: Next.js (자동)

### 환경 변수 (4개)

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | 2단계 Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 2단계 Publishable key |
| `GEMINI_API_KEY` | Google AI Studio 키 |
| `GEMINI_MODEL` | `gemini-2.0-flash` |

6. **Deploy**

배포 URL 예: `https://dumpitai.vercel.app`

---

## 5단계: Supabase Auth URL (배포 후)

Supabase → **Authentication → URL Configuration**

| 항목 | 값 |
|------|-----|
| Site URL | `https://dumpitai.vercel.app` (실제 URL) |
| Redirect URLs | 아래 추가 |

```
http://localhost:3000/auth/callback
https://dumpitai.vercel.app/auth/callback
```

---

## 완료 체크리스트

- [ ] dumpit 폴더 변경 없음
- [ ] GitHub `dumpitAI` 저장소 생성·push
- [ ] Supabase `dumpitAI` 프로젝트 + schema 적용
- [ ] `.env.local`이 **새** Supabase를 가리킴
- [ ] Vercel `dumpitAI` 프로젝트 배포
- [ ] Auth Redirect URL 설정
- [ ] `/inbox` AI 분석 동작 확인

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| dumpit 데이터가 보임 | 기존 Supabase 연결 | `.env.local` URL 교체 |
| inbox_logs 테이블 없음 | 008 미적용 | `schema-agent-full.sql` 실행 |
| 로그인 리다이렉트 실패 | Auth URL 미설정 | 5단계 Redirect URLs 추가 |
| GEMINI_API_KEY 오류 | 키 미설정 | `.env.local` / Vercel env 확인 |
