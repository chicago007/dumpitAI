# Dumpit — 설계 문서

> **한 줄 입력 → 자동 분류 → 실행**  
> Supabase + Vercel 기반 스마트 메모·할일·일정 웹앱

---

## 1. 제품 비전

Dumpit은 사용자가 생각나는 대로 한 줄만 입력하면, 앱이 **무엇을(Todo/일정/메모)** + **어떤 분야(카테고리)** 인지 자동으로 판단해 저장합니다.

| 입력 예시 | 자동 분류 |
|-----------|-----------|
| "내일 보고서 제출해야 함" | Todo · 업무 · 마감: 내일 |
| "제주도 항공권 예약" | Todo · 여행 |
| "아토믹 해빗 3장 읽기" | Todo · 독서 |
| "오늘 저녁 헬스장" | Schedule · 운동 |
| "탄수화물 줄이기 메모" | Memo · 다이어트 |

---

## 2. 핵심 사용자 흐름

```
[빠른 입력창] → 규칙/키워드 분류 → 미리보기 카드 → 저장
                      ↓
           type (todo/schedule/memo) + category + due_at
```

### 입력 UX

- 메인 화면 상단에 항상 보이는 **단일 입력창**
- 타이핑 즉시 **실시간 미리보기** (타입, 카테고리, 마감일)
- 자동 분류 결과를 **칩(chip)** 으로 표시, 탭 한 번으로 수정
- "이 키워드로 항상 분류" 선택 시 카테고리 `keywords`에 학습

### 완료 UX

- 체크박스로 완료 → `status: done`, `completed_at` 기록
- 취소선 + 흐린 색상으로 표시
- 완료 항목 재탭 시 되돌리기

---

## 3. 화면 구성

| 화면 | 경로 | 설명 |
|------|------|------|
| **홈 / 캡처** | `/` | 입력창 + 최근 항목 |
| **Today** | `/today` | 오늘 할 일 + 일정 타임라인 |
| **카테고리** | `/categories` | 카테고리 목록 |
| **카테고리 상세** | `/categories/[id]` | 카테고리별 항목 리스트 |
| **완료** | `/done` | 완료된 항목 + 통계 |
| **설정** | `/settings` | 카테고리 CRUD, 계정 |
| **로그인** | `/login` | Supabase Auth |
| **회원가입** | `/signup` | 가입 + 기본 카테고리 시드 |

---

## 4. 기본 카테고리 (가입 시 시드)

| 이름 | 아이콘 | 색상 | 키워드 예시 |
|------|--------|------|-------------|
| 업무 | 💼 | `#3B82F6` | 회의, 보고서, 제출, 프로젝트, 이메일 |
| 여행 | ✈️ | `#0EA5E9` | 항공, 호텔, 여권, 제주, 해외 |
| 독서 | 📚 | `#92400E` | 책, 읽기, 독서, 페이지 |
| 운동 | 🏋️ | `#EF4444` | 헬스, 러닝, 요가, PT, 근력 |
| 다이어트 | 🥗 | `#22C55E` | 칼로리, 체중, 식단, 탄수화물 |
| 생활 | 🏠 | `#6B7280` | 장보기, 청소, 세탁, 공과금 |
| 건강 | 💊 | `#EC4899` | 병원, 약, 검진, 수면 |
| 재정 | 💰 | `#EAB308` | 저축, 카드, 예산, 투자 |
| 학습 | 🎓 | `#8B5CF6` | 공부, 강의, 시험, 자격증 |
| 기타 | 📌 | `#9CA3AF` | 매칭 실패 시 기본값 |

---

## 5. 데이터 모델

### categories

```sql
id, user_id, name, icon, color, keywords text[],
sort_order, is_default, is_deleted,
created_at, updated_at
```

### entries

```sql
id, user_id, content, type, category_id,
status, due_at, end_at, completed_at,
priority, metadata jsonb,
created_at, updated_at, is_deleted
```

- `type`: `memo` | `todo` | `schedule`
- `status`: `active` | `done` | `archived`

### classification_feedback (v2)

사용자 수정 이력을 AI few-shot 학습에 활용.

---

## 6. 자동 분류 전략

### MVP: 규칙 + 키워드 (비용 0)

**타입 분류**

- 날짜/시간 + 장소/약속 패턴 → `schedule`
- `~해야`, `제출`, `확인`, `하기` 등 → `todo`
- 그 외 → `memo`

**카테고리 분류**

- 각 카테고리 `keywords` 배열과 입력 텍스트 매칭
- 최다 매칭 카테고리 선택, 동점/무매칭 시 `기타`

**마감일 파싱**

- `내일`, `모레`, `오늘`, `N일 후`, `월요일` 등 한국어 패턴
- v2: `chrono-node` 또는 LLM

### v2: AI 보조

- 키워드 confidence < 0.7 일 때만 LLM 호출
- Vercel AI SDK + Edge/Serverless

---

## 7. 기술 스택

| 영역 | 선택 |
|------|------|
| Frontend | Next.js 15 (App Router) |
| 배포 | Vercel |
| UI | Tailwind CSS |
| Auth / DB | Supabase Auth + PostgreSQL + RLS |
| Realtime | Supabase Realtime (v2) |
| AI 분류 | Vercel AI SDK (v2) |

```
[Browser] → [Vercel Next.js] → [Supabase]
                ↓
         [AI 분류 API] (v2)
```

---

## 8. 보안

- 모든 테이블 **Row Level Security** 적용
- `user_id = auth.uid()` 조건으로 본인 데이터만 접근
- 서버 액션에서 세션 재검증

---

## 9. MVP 범위

**포함**

- [x] Supabase Auth (이메일)
- [x] 가입 시 기본 카테고리 10개 시드
- [x] 단일 입력창 + 키워드 기반 분류 + 미리보기
- [x] 카테고리 CRUD
- [x] Todo/Schedule 완료 체크
- [x] Today / 카테고리 / 완료 뷰

**v2 제외**

- AI 분류, 반복 일정, 푸시 알림, 모바일 앱, 협업

---

## 10. 네이밍

| 항목 | 값 |
|------|-----|
| 프로젝트명 | **Dumpit** |
| 저장소 폴더 | `dumpit` |
| 포지셔닝 | 생각을 바로 던지고(dump) 정리해 주는 앱 |
