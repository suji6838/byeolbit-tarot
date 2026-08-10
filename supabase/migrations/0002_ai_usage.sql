-- 계정당 스프레드(카드 종류)별 무료 AI 해석 1회 제한을 추적하는 테이블
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  spread_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, spread_id)
);
alter table public.ai_usage enable row level security;
create policy "ai_usage_select_own" on public.ai_usage for select using (auth.uid() = user_id);
create policy "ai_usage_insert_own" on public.ai_usage for insert with check (auth.uid() = user_id);
