// Google OAuth Client ID (공개 식별자, 비밀값 아님).
// https://console.cloud.google.com/apis/credentials 에서 발급.
export const GOOGLE_CLIENT_ID = '972638757795-boivt58623m7240704cjolosiqiubeoo.apps.googleusercontent.com'

// Supabase 프로젝트 URL + anon(public) 키 (RLS로 보호되는 공개 식별자, 비밀값 아님).
// https://supabase.com/dashboard/project/_/settings/api 에서 확인.
export const SUPABASE_URL = 'https://awzbultaujvmkrrhaxuj.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_da6EdXLCv-r41kf_oRtNlw_3NMxWrU8'

// 관리자 계정 (UI 노출 여부만 결정, 실제 접근 제어는 서버에서 재검증).
export const ADMIN_EMAIL = 'joan6838@gmail.com'

// 코인 충전 상품: 10코인에 2,900원.
export const COIN_PACKAGE = { coins: 10, amount: 2900 }

// 리틀리 판매 페이지 링크 (사업자등록 전이라 개인 판매자로 진행, 결제는 리틀리에서 하고
// 앱에는 입금자명만 입력받아 수동 승인함).
export const LITT_PRODUCT_URL = 'https://litt.ly/byeolbittarot'

// 문의하기 연락처 (하단 푸터에 텍스트로 표시).
export const CONTACT_EMAIL = 'amandakim6838@gmail.com'
