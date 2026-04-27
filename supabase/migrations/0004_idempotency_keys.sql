-- Idempotency keys: every offline-queued clock action carries a client-generated
-- UUID (`client_op_id`) so the server can dedupe replays. A drained queue that
-- partially landed (write succeeded, response packet dropped) won't create a
-- duplicate entry on its second attempt.
--
-- Only `time_entries` rows that originate from a clockIn or switchWorkCode
-- carry an op id; clockOut / takeBreak modify an existing entry by id and are
-- naturally idempotent because their payload's client_at_iso doesn't change
-- across retries.

alter table public.time_entries
  add column if not exists client_op_id text;

-- Partial unique index so legacy rows (NULL client_op_id) don't collide.
create unique index if not exists time_entries_client_op_id_uniq
  on public.time_entries (client_op_id)
  where client_op_id is not null;

-- Update the atomic switch_work_code function so the new entry it inserts
-- carries the client_op_id supplied in the JSONB payload. Replays of the
-- same switch land on the existing row instead of creating a second one.
create or replace function public.switch_work_code(
  p_entry_id uuid,
  p_end_time time,
  p_hours numeric,
  p_clock_out_lat numeric,
  p_clock_out_lng numeric,
  p_edited_by uuid,
  p_new_entry jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_new_id uuid;
  v_op_id text;
begin
  v_op_id := nullif(p_new_entry->>'client_op_id', '');

  -- Replay short-circuit: if the op already produced an entry, return its id
  -- without touching the books a second time. We don't try to re-close the
  -- old entry either; the first run already did that.
  if v_op_id is not null then
    select id into v_new_id
      from time_entries
     where client_op_id = v_op_id;
    if v_new_id is not null then
      return v_new_id;
    end if;
  end if;

  select employee_id into v_employee_id
    from time_entries
   where id = p_entry_id
   for update;

  if v_employee_id is null then
    raise exception 'switch_work_code: entry % not found', p_entry_id;
  end if;

  if (p_new_entry->>'employee_id')::uuid <> v_employee_id then
    raise exception 'switch_work_code: new entry employee_id does not match existing entry';
  end if;

  update time_entries
     set end_time      = p_end_time,
         hours         = p_hours,
         clock_out_lat = p_clock_out_lat,
         clock_out_lng = p_clock_out_lng,
         status        = 'submitted',
         edited_by     = p_edited_by,
         edited_at     = now()
   where id = p_entry_id;

  insert into time_entries (
    employee_id, date, start_time, end_time, hours, type, otmult,
    job, phase, cat, class, department, worktype, wcomp1, wcomp2,
    rate, notes, voice_text, clock_in_lat, clock_in_lng,
    status, created_by, client_op_id
  )
  select
    (p_new_entry->>'employee_id')::uuid,
    (p_new_entry->>'date')::date,
    (p_new_entry->>'start_time')::time,
    null,
    (p_new_entry->>'hours')::numeric,
    coalesce((p_new_entry->>'type')::smallint, 1),
    nullif(p_new_entry->>'otmult', '')::numeric,
    p_new_entry->>'job',
    p_new_entry->>'phase',
    p_new_entry->>'cat',
    p_new_entry->>'class',
    p_new_entry->>'department',
    nullif(p_new_entry->>'worktype', '')::smallint,
    p_new_entry->>'wcomp1',
    p_new_entry->>'wcomp2',
    nullif(p_new_entry->>'rate', '')::numeric,
    p_new_entry->>'notes',
    p_new_entry->>'voice_text',
    nullif(p_new_entry->>'clock_in_lat', '')::numeric,
    nullif(p_new_entry->>'clock_in_lng', '')::numeric,
    coalesce((p_new_entry->>'status')::entry_status, 'draft'),
    nullif(p_new_entry->>'created_by', '')::uuid,
    v_op_id
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.switch_work_code(
  uuid, time, numeric, numeric, numeric, uuid, jsonb
) to authenticated;
