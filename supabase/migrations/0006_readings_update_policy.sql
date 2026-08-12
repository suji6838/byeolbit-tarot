-- AI 상담사 답변을 나중에(카드 저장 이후 비동기로) readings.ai_interpretation에
-- 채워 넣을 수 있도록 본인 소유 행에 한해 update를 허용한다.
create policy "readings_update_own" on public.readings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
