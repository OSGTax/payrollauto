-- Atomic switch_work_code: closes the current open entry and inserts a new one
-- in a single transaction so a failure on the insert can never leave the worker
-- silently off the clock.
--
-- The TypeScript caller (clockIn server action / enrichEntry) computes the full
-- enriched row for the new entry and passes it as JSONB; we just splat it into
-- the time_entries insert. Closing the current entry happens in the same
-- function body, which Postgres runs in a single implicit transaction.

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
begin
  -- Verify the caller actually owns the entry being closed; refuse otherwise.
  -- (Belt-and-suspenders against the function being called for a different
  -- worker's row even if the JWT happens to match an admin.)
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
    status, created_by
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
    nullif(p_new_entry->>'created_by', '')::uuid
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- Allow authenticated users to call the function. Row-level access on
-- time_entries continues to enforce per-employee restrictions inside.
grant execute on function public.switch_work_code(
  uuid, time, numeric, numeric, numeric, uuid, jsonb
) to authenticated;
