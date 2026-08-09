-- 별빛마음상담소: 로그인 회원의 타로 상담 기록을 저장하는 테이블
create table if not exists public.readings (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  spread_id text not null,
  spread_name text not null,
  question text not null default '',
  cards jsonb not null default '[]'::jsonb,
  base_interpretation text not null default '',
  ai_interpretation text
);
alter table public.readings enable row level security;
create policy "readings_select_own" on public.readings for select using (auth.uid() = user_id);
create policy "readings_insert_own" on public.readings for insert with check (auth.uid() = user_id);
create index if not exists readings_user_id_created_at_idx on public.readings (user_id, created_at desc);
