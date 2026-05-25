-- Run this in the Supabase SQL editor

create table public.messages (
  id         uuid        primary key default gen_random_uuid(),
  username   text        not null,
  content    text        not null,
  likes      integer     not null default 0,
  dislikes   integer     not null default 0,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "read_all"   on public.messages for select using (true);
create policy "insert_all" on public.messages for insert with check (true);
create policy "update_all" on public.messages for update using (true);

-- Atomic increment for likes/dislikes
create or replace function react_to_message(msg_id uuid, reaction text)
returns setof public.messages
language sql
as $$
  update public.messages
  set
    likes    = likes    + case when reaction = 'like'    then 1 else 0 end,
    dislikes = dislikes + case when reaction = 'dislike' then 1 else 0 end
  where id = msg_id
  returning *;
$$;

-- Migration: run these if the table already exists
-- alter table public.messages add column if not exists likes    integer not null default 0;
-- alter table public.messages add column if not exists dislikes integer not null default 0;
-- create policy "update_all" on public.messages for update using (true);
