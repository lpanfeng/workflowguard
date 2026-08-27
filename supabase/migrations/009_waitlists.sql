-- Waitlist表：用户等待名单
-- 用于收集对WorkflowGuard感兴趣的用户邮箱

create table if not exists public.waitlists (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text default null,
  company text default null,
  role text default null,
  source text default 'web',
  status text default 'pending' check (status in ('pending', 'active', 'rejected', 'archived')),
  note text default null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS策略
alter table public.waitlists enable row level security;

-- 任何人可以插入等待名单
create policy "任何人可插入" on public.waitlists
  for insert with check (true);

-- 管理员可查看所有等待名单
create policy "管理员可读取" on public.waitlists
  for select using (true);

-- 管理员可更新状态
create policy "管理员可更新" on public.waitlists
  for update using (true);

-- 索引
create index if not exists idx_waitlists_email on waitlists(email);
create index if not exists idx_waitlists_status on waitlists(status);
create index if not exists idx_waitlists_created_at on waitlists(created_at desc);
create unique index if not exists idx_waitlists_email_unique on waitlists(email) where status != 'rejected';

-- 自动更新updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_waitlist_updated_at
  before update on public.waitlists
  for each row execute procedure public.handle_updated_at();
