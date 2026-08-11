-- 결제 확인 없이 즉시 자동 충전(신뢰 기반)으로 전환. 관리자는 사후에 리틀리
-- 판매내역과 대조해서 이상한 건 회수(revoke)하는 감사 역할로 바뀜.
alter table public.charge_requests add column if not exists revoked boolean not null default false;
alter table public.charge_requests add column if not exists revoked_at timestamptz;

-- 결제 없이 받아간 게 확인되면 관리자가 그만큼 코인을 회수(0 밑으로는 안 내려감).
-- 서버(서비스 롤)에서만 호출.
create or replace function public.revoke_coins(p_user_id uuid, p_coins integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  update wallets set coins = greatest(0, coins - p_coins), updated_at = now()
    where user_id = p_user_id
    returning coins into v_new;
  return coalesce(v_new, 0);
end;
$$;
revoke execute on function public.revoke_coins(uuid, integer) from public;
revoke execute on function public.revoke_coins(uuid, integer) from anon;
revoke execute on function public.revoke_coins(uuid, integer) from authenticated;
grant execute on function public.revoke_coins(uuid, integer) to service_role;
