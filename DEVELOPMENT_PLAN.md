# Dumpit — 개발 계획서

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | Dumpit |
| 목표 | 한 줄 입력으로 메모·할일·일정을 자동 분류·관리하는 웹앱 |
| 기간 (MVP) | 2~3주 |
| 스택 | Next.js, Tailwind, Supabase, Vercel |

---

## 2. 마일스톤

### Phase 0 — 환경 구성 (Day 1)

- [x] 프로젝트 초기화 (Next.js + TypeScript + Tailwind)
- [x] Supabase 프로젝트 연결 설정 (`.env.example`)
- [x] DB 마이그레이션 SQL 작성
- [x] 설계 문서 (`DESIGN.md`) 정리

**산출물:** 실행 가능한 빈 앱, 스키마 SQL

---

### Phase 1 — 인증 & 데이터 기반 (Day 2~4)

- [x] Supabase Auth (이메일 로그인/회원가입)
- [x] Middleware 세션 관리
- [x] `categories`, `entries` 테이블 + RLS
- [x] 가입 시 기본 카테고리 시드 트리거
- [x] Server Actions: 카테고리/엔트리 CRUD

**완료 기준:** 로그인 후 본인 카테고리 10개 자동 생성

---

### Phase 2 — 핵심 입력 & 분류 (Day 5~8)

- [x] 한국어 키워드 기반 타입 분류 (`classify.ts`)
- [x] 카테고리 키워드 매칭
- [x] 한국어 상대 날짜 파싱 (내일, 모레 등)
- [x] 캡처 입력 UI + 실시간 미리보기
- [x] 분류 결과 수동 수정 (칩 선택)
- [x] 키워드 학습 (수정 시 keywords 추가)

**완료 기준:** 입력 → 미리보기 → 저장 → DB 반영 E2E

---

### Phase 3 — 뷰 & 완료 처리 (Day 9~12)

- [x] Today 뷰 (오늘 due 항목)
- [x] 카테고리 목록 / 상세 뷰
- [x] 완료 뷰 + 주간 통계
- [x] 체크박스 완료 / 되돌리기
- [x] 앱 네비게이션 레이아웃

**완료 기준:** 주요 5개 화면 동작, 완료 상태 UI 반영

---

### Phase 4 — 카테고리 관리 (Day 13~14)

- [x] 설정 화면: 카테고리 목록
- [x] 카테고리 추가 / 수정 / 삭제 (soft delete)
- [x] 삭제 시 항목 → 기타 카테고리 이동

**완료 기준:** 사용자 정의 카테고리 전체 CRUD

---

### Phase 5 — 배포 & QA (Day 15~18)

- [ ] Vercel 프로젝트 연결
- [ ] Supabase 프로덕션 URL/키 설정
- [ ] 마이그레이션 프로덕션 적용
- [ ] 크로스 브라우저 QA
- [ ] 모바일 반응형 점검

**완료 기준:** 프로덕션 URL에서 회원가입~입력~완료 플로우 동작

---

## 3. v2 로드맵 (MVP 이후)

| 우선순위 | 기능 | 예상 |
|----------|------|------|
| P1 | AI 분류 (confidence 낮을 때) | 1주 |
| P1 | chrono-node 고급 날짜 파싱 | 3일 |
| P2 | 주간 리뷰 리포트 | 3일 |
| P2 | Supabase Realtime 동기화 | 3일 |
| P3 | Google OAuth | 2일 |
| P3 | 반복 일정 | 1주 |
| P4 | PWA / 모바일 최적화 | 1주 |

---

## 4. 디렉터리 구조

```
dumpit/
├── DESIGN.md
├── DEVELOPMENT_PLAN.md
├── README.md
├── supabase/migrations/001_initial_schema.sql
├── src/
│   ├── app/              # 페이지 (App Router)
│   ├── components/       # UI 컴포넌트
│   ├── lib/              # Supabase, 분류, 타입
│   └── actions/          # Server Actions
└── .env.example
```

---

## 5. 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 6. 로컬 실행 순서

1. Supabase 대시보드에서 프로젝트 생성
2. `supabase/migrations/001_initial_schema.sql` SQL Editor에서 실행
3. `.env.local`에 URL/anon key 입력
4. `npm install && npm run dev`

---

## 7. 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| 한국어 날짜 파싱 부정확 | MVP는 상대 날짜만, v2에서 chrono-node |
| 키워드 분류 오분류 | UI에서 즉시 수정 + keywords 학습 |
| Supabase RLS 설정 오류 | 마이그레이션에 정책 통합, 테스트 계정 검증 |

---

## 8. 성공 지표 (MVP)

- 회원가입 후 30초 이내 첫 메모 입력 가능
- 자동 분류 정확도 70% 이상 (키워드 매칭 기준)
- Today / 카테고리 / 완료 화면 3탭 이내 접근
