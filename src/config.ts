// Google OAuth Client ID (공개 식별자, 비밀값 아님).
// https://console.cloud.google.com/apis/credentials 에서 발급.
export const GOOGLE_CLIENT_ID = '972638757795-boivt58623m7240704cjolosiqiubeoo.apps.googleusercontent.com'

// Supabase 프로젝트 URL + anon(public) 키 (RLS로 보호되는 공개 식별자, 비밀값 아님).
// https://supabase.com/dashboard/project/_/settings/api 에서 확인.
export const SUPABASE_URL = 'https://awzbultaujvmkrrhaxuj.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_da6EdXLCv-r41kf_oRtNlw_3NMxWrU8'

// 관리자 계정 (UI 노출 여부만 결정, 실제 접근 제어는 서버에서 재검증).
export const ADMIN_EMAIL = 'joan6838@gmail.com'

// Toss Payments 클라이언트 키 (공개 식별자, 비밀값 아님. 시크릿 키는 서버 환경변수로만 보관).
// https://developers.tosspayments.com 개발자센터 > API 키 에서 확인.
export const TOSS_CLIENT_KEY = 'REPLACE_WITH_TOSS_CLIENT_KEY'

// 코인 충전 상품: 10코인에 3,000원.
export const COIN_PACKAGE = { coins: 10, amount: 3000 }
