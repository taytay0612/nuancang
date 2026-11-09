-- 暖仓 · Supabase 初始化
-- 用法：Supabase 控制台 → SQL Editor → New query → 整段粘贴 → Run
-- 这个脚本可以重复执行，不会删除已有数据。

create table if not exists public.nuancang_spaces (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.nuancang_spaces is '暖仓：一个账号一行，整份数据放在 data';

alter table public.nuancang_spaces enable row level security;

drop policy if exists nuancang_select on public.nuancang_spaces;
drop policy if exists nuancang_insert on public.nuancang_spaces;
drop policy if exists nuancang_update on public.nuancang_spaces;
drop policy if exists nuancang_delete on public.nuancang_spaces;

create policy nuancang_select on public.nuancang_spaces
  for select to authenticated using (owner_id = auth.uid());

create policy nuancang_insert on public.nuancang_spaces
  for insert to authenticated with check (owner_id = auth.uid());

create policy nuancang_update on public.nuancang_spaces
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy nuancang_delete on public.nuancang_spaces
  for delete to authenticated using (owner_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.nuancang_spaces to authenticated;
revoke all on public.nuancang_spaces from anon;
