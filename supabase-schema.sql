-- Run this once in the Supabase SQL Editor (same project as logic-circuit-sim).
create table if not exists public.fsm_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  config jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.fsm_designs enable row level security;

create policy "select own fsm_designs" on public.fsm_designs for select using (auth.uid() = user_id);
create policy "insert own fsm_designs" on public.fsm_designs for insert with check (auth.uid() = user_id);
create policy "delete own fsm_designs" on public.fsm_designs for delete using (auth.uid() = user_id);
