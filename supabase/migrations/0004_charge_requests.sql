-- Toss 자동결제는 사업자등록 전이라 보류 — 리틀리(개인 판매자) 외부 결제 + 수동 승인 방식으로 전환
drop table if exists public.payments;

create table if not exists public.charge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_note text not null,
  coins integer not null,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.charge_requests enable row level security;
create policy "charge_requests_select_own" on public.charge_requests for select using (auth.uid() = user_id);
create policy "charge_requests_insert_own" on public.charge_requests for insert with check (auth.uid() = user_id and status = 'pending');
create index if not exists charge_requests_status_created_idx on public.charge_requests (status, created_at desc);
