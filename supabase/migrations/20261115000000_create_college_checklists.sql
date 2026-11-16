create table public.college_checklists (
  user_id text primary key,
  schools jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint college_checklists_schools_is_array
    check (pg_catalog.jsonb_typeof(schools) = 'array')
);

alter table public.college_checklists enable row level security;

revoke all on table public.college_checklists from public, anon, authenticated;
grant select, insert, update on table public.college_checklists to authenticated;

create policy "Users can read their own college checklist"
  on public.college_checklists
  for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "Users can create their own college checklist"
  on public.college_checklists
  for insert
  to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Users can update their own college checklist"
  on public.college_checklists
  for update
  to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

create function public.set_college_checklists_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger set_college_checklists_updated_at
  before update on public.college_checklists
  for each row
  execute function public.set_college_checklists_updated_at();
