-- Admin push-back: admin can revert approved entries to submitted
-- for manager re-review, attaching a note.

alter table time_entries
  add column admin_note text,
  add column pushed_back_at timestamptz,
  add column pushed_back_by uuid references employees(id);

create index on time_entries (pushed_back_at) where pushed_back_at is not null;
