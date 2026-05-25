create table public.messages (
  id         uuid        primary key default gen_random_uuid(),
  username   text        not null,
  content    text        not null,
  created_at timestamptz not null default now()
);


alter table public.messages enable row level security;

create policy "read_all"   on public.messages for select using (true);
create policy "insert_all" on public.messages for insert with check (true);
