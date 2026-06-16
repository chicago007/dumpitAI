# Dumpit 배포 가이드 (Vercel)

다른 기기(휴대폰·태블릿·다른 PC)에서 접속할 수 있는 공개 URL을 만드는 방법입니다.

## 1. Supabase 프로덕션 설정

### DB 마이그레이션 (아직 안 했다면)

Supabase SQL Editor에서 순서대로 실행:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_add_checklist.sql`

### 인증 URL 설정

Supabase 대시보드 → **Authentication** → **URL Configuration**

| 항목 | 값 |
|------|-----|
| **Site URL** | `https://your-app.vercel.app` (배포 후 실제 URL) |
| **Redirect URLs** | 아래 두 줄 추가 |

```
http://localhost:3000/auth/callback
https://your-app.vercel.app/auth/callback
```

> 배포 후 Vercel이 준 실제 도메인으로 `your-app.vercel.app`을 바꿔주세요.

---

## 2. GitHub에 코드 올리기

```bash
cd /Users/ybkim/coding/dumpit
git init
git add .
git commit -m "Initial commit: Dumpit MVP"
```

GitHub에서 새 저장소를 만들고:

```bash
git remote add origin https://github.com/YOUR_USERNAME/dumpit.git
git branch -M main
git push -u origin main
```

---

## 3. Vercel 배포

1. [vercel.com](https://vercel.com) 로그인 (GitHub 연동)
2. **Add New Project** → GitHub 저장소 `dumpit` 선택
3. **Environment Variables** 추가:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable key |

4. **Deploy** 클릭

배포 완료 후 `https://dumpit-xxx.vercel.app` 형태의 URL이 생성됩니다.

---

## 4. 배포 후 확인

1. 생성된 URL을 휴대폰 브라우저에서 열기
2. 회원가입 → 로그인 → 한 줄 입력 테스트
3. Supabase **Site URL**과 **Redirect URLs**를 실제 Vercel URL로 업데이트

---

## 5. 휴대폰에 앱처럼 설치 (PWA)

### iPhone (Safari)

1. URL 접속 후 하단 **공유** 버튼
2. **홈 화면에 추가** 선택

### Android (Chrome)

1. URL 접속
2. 메뉴 → **홈 화면에 추가** 또는 **앱 설치**

---

## 로컬에서 프로덕션 빌드 테스트

```bash
npm run build
npm start
```

http://localhost:3000 에서 프로덕션 빌드 확인
