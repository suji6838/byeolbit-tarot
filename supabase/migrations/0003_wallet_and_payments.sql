-- 기존 "스프레드별 평생 1회" 방식은 폐기 (매일 무료 1회 + 코인 결제 방식으로 대체)
drop table if exists public.ai_usage;

-- 코인 잔액 (구매 적립/사용 차감은 서버 서비스 롤에서만 처리)
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);

-- Toss 결제 주문/검증 기록
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  amount integer not null,
  coins integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  toss_payment_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create policy "payments_select_own" on public.payments for select using (auth.uid() = user_id);
create policy "payments_insert_own" on public.payments for insert with check (auth.uid() = user_id and status = 'pending');

-- 매일 무료 1회 판단 + AI 사용 이력(무료/코인 사용 여부)
create table if not exists public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spread_id text not null,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ai_usage_log enable row level security;
create policy "ai_usage_log_select_own" on public.ai_usage_log for select using (auth.uid() = user_id);
create index if not exists ai_usage_log_user_created_idx on public.ai_usage_log (user_id, created_at desc);

-- 오늘 무료 1회를 이미 썼으면 코인 10개를 원자적으로 차감, 아니면 무료로 처리.
-- 서버(서비스 롤)에서만 호출 — 클라이언트가 직접 호출하면 남의 계정을 소모시킬 수 있어 EXECUTE 권한을 서비스 롤로만 제한함.
create or replace function public.consume_ai_credit(p_user_id uuid, p_spread_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_used boolean;
  v_coins integer;
begin
  select exists(
    select 1 from ai_usage_log
    where user_id = p_user_id and is_paid = false
      and created_at >= date_trunc('day', now())
  ) into v_free_used;

  if not v_free_used then
    insert into ai_usage_log (user_id, spread_id, is_paid) values (p_user_id, p_spread_id, false);
    return jsonb_build_object('ok', true, 'method', 'free');
  end if;

  update wallets set coins = coins - 10, updated_at = now()
    where user_id = p_user_id and coins >= 10
    returning coins into v_coins;

  if v_coins is null then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_coins');
  end if;

  insert into ai_usage_log (user_id, spread_id, is_paid) values (p_user_id, p_spread_id, true);
  return jsonb_build_object('ok', true, 'method', 'paid', 'remainingCoins', v_coins);
end;
$$;
revoke execute on function public.consume_ai_credit(uuid, text) from public;
revoke execute on function public.consume_ai_credit(uuid, text) from anon;
revoke execute on function public.consume_ai_credit(uuid, text) from authenticated;
grant execute on function public.consume_ai_credit(uuid, text) to service_role;

-- 검증된 결제 건에 대해서만 코인을 적립. 서버(서비스 롤)에서만 호출.
create or replace function public.credit_coins(p_user_id uuid, p_coins integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  insert into wallets (user_id, coins) values (p_user_id, p_coins)
  on conflict (user_id) do update set coins = wallets.coins + excluded.coins, updated_at = now()
  returning coins into v_new;
  return v_new;
end;
$$;
revoke execute on function public.credit_coins(uuid, integer) from public;
revoke execute on function public.credit_coins(uuid, integer) from anon;
revoke execute on function public.credit_coins(uuid, integer) from authenticated;
grant execute on function public.credit_coins(uuid, integer) to service_role;
