// Google OAuth Client ID (공개 식별자, 비밀값 아님).
// https://console.cloud.google.com/apis/credentials 에서 발급.
export const GOOGLE_CLIENT_ID = 'REPLACE_WITH_GOOGLE_CLIENT_ID.apps.googleusercontent.com'

// Supabase 프로젝트 URL + anon(public) 키 (RLS로 보호되는 공개 식별자, 비밀값 아님).
// https://supabase.com/dashboard/project/_/settings/api 에서 확인.
export const SUPABASE_URL = 'REPLACE_WITH_SUPABASE_URL'
export const SUPABASE_ANON_KEY = 'REPLACE_WITH_SUPABASE_ANON_KEY'

// 관리자 계정 (UI 노출 여부만 결정, 실제 접근 제어는 서버에서 재검증).
export const ADMIN_EMAIL = 'joan6838@gmail.com'
