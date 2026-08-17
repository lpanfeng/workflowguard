-- Feedback表：用户反馈收集
-- 用于收集用户对WorkflowGuard的意见和功能请求

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  category text default 'general',
  message text not null,
  source text default 'web',
  rating integer check (rating >= 1 and rating <= 5),
  status text default 'new' check (status in ('new', 'read', 'responded', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS策略
alter table public.feedbacks enable row level security;

-- 用户只能插入自己的反馈
create policy "用户可插入反馈" on public.feedbacks
  for insert with check (true);

-- 管理员可查看所有反馈
create policy "管理员可读所有反馈" on public.feedbacks
  for select using (true);

-- 管理员可更新反馈状态
create policy "管理员可更新反馈" on public.feedbacks
  for update using (true);

-- 索引
create index if not exists idx_feedbacks_created_at on public.feedbacks(created_at desc);
create index if not exists idx_feedbacks_category on public.feedbacks(category);
create index if not exists idx_feedbacks_status on public.feedbacks(status);

-- 自动更新updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_updated_at
  before update on public.feedbacks
  for each row execute procedure public.handle_updated_at();
