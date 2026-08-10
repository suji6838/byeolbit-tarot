# 별빛마음상담소

타로 카드 스프레드를 뽑고, 카드별 기본 해석과 AI 상담사의 보강 해석을 받아보는 웹 앱입니다.
온담채 웰니스와 동일한 패턴(Lovable 등 특정 플랫폼에 종속되지 않는 순수 Vite + React 18 + TypeScript + Supabase)으로 만들었습니다.

## 기술 스택

- Vite + React 18 + TypeScript (SPA, 라우터 없이 탭 상태로 전환)
- `@supabase/supabase-js` — 로그인(구글/이메일) + 상담 기록 저장
- Vercel Serverless Function(`api/interpret.js`) — Google Gemini API(무료 티어)를 호출해 AI 보강 해석 생성
- 배포: Vercel

## 로컬에서 실행하기 전에 반드시 해야 할 설정

이 저장소를 클론한 것만으로는 실행되지 않습니다. 아래 값을 실제 값으로 채워야 합니다.

### 1. Supabase 프로젝트 생성

1. https://supabase.com 에서 새 프로젝트 생성
2. `supabase/migrations/0001_init.sql`의 내용을 Supabase 대시보드 SQL 에디터(Project → SQL Editor)에서 직접 실행 (Claude Code가 마이그레이션 파일을 커밋하는 것만으로는 DB에 반영되지 않습니다 — 반드시 SQL 에디터에서 실행 확인 필요)
3. Project Settings → API에서 **Project URL**과 **anon(public) key**를 확인해 `src/config.ts`의 `SUPABASE_URL`, `SUPABASE_ANON_KEY`를 교체
4. Authentication → Providers에서 Email 로그인 활성화 (기본 활성화되어 있음)

### 2. 구글 로그인 설정

1. https://console.cloud.google.com/apis/credentials 에서 OAuth 2.0 클라이언트 ID 생성 (유형: 웹 애플리케이션)
2. 승인된 자바스크립트 원본에 로컬(`http://localhost:5173`)과 배포 도메인 추가
3. 발급받은 클라이언트 ID를 `src/config.ts`의 `GOOGLE_CLIENT_ID`에 입력
4. Supabase 대시보드 Authentication → Providers → Google에도 같은 클라이언트 ID/시크릿 등록

### 3. Gemini API 키 (AI 해석 기능, 무료)

- `api/interpret.js`가 `process.env.GEMINI_API_KEY`를 사용해 Google Gemini(`gemini-2.0-flash`) API를 호출합니다.
- https://aistudio.google.com/apikey 에서 신용카드 없이 무료로 키 발급 가능 (무료 티어 사용량 한도 내에서 과금 없음)
- 로컬 개발 시: 프로젝트 루트에 `.env`(gitignore됨) 만들고 `GEMINI_API_KEY=...` 추가 후 `vercel dev`로 실행하거나, Vercel 배포 환경에서만 테스트
- Vercel 배포 시: 프로젝트 Settings → Environment Variables에 `GEMINI_API_KEY` 추가 필수 (없으면 AI 해석 버튼이 "준비중입니다"를 반환함, 카드별 기본 해석은 키 없이도 정상 작동)

### 4. 설치 및 실행

```bash
npm install
npm run dev       # 로컬 개발 서버
npm run build     # tsc 타입체크 + 프로덕션 빌드
```

## 배포 (Vercel)

1. GitHub 저장소에 push
2. https://vercel.com 에서 이 저장소 Import
3. Environment Variables에 `GEMINI_API_KEY` 등록 (Supabase 키는 `src/config.ts`에 이미 포함되어 있어 별도 등록 불필요 — RLS로 보호되는 공개 키)
4. Deploy

## 참고: 카드 이미지

현재는 78장 전체를 이모지 아이콘 + 텍스트(이름/키워드/해석) 기반으로 표시합니다.
나중에 카드별 일러스트를 추가하려면 `src/data.ts`의 `TarotCard.icon` 대신 이미지 경로 필드를 추가하고 `TarotCardView.tsx`를 수정하면 됩니다.
