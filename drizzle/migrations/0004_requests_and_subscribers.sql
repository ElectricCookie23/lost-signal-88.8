create table public.requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100),
  email text not null check (length(email) between 3 and 254),
  topic text not null check (topic in ('Song request','Order question','Restock alert','Shout-out on air','Something else')),
  message text not null default '' check (length(message) <= 2000),
  created_at timestamptz not null default now()
);
grant insert on public.requests to anon, authenticated;
grant select on public.requests to authenticated;
grant all on public.requests to service_role;
alter table public.requests enable row level security;
create policy "anyone sends requests" on public.requests for insert to anon, authenticated with check (true);
create policy "admin reads requests" on public.requests for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  created_at timestamptz not null default now()
);
grant insert on public.subscribers to anon, authenticated;
grant select on public.subscribers to authenticated;
grant all on public.subscribers to service_role;
alter table public.subscribers enable row level security;
create policy "anyone subscribes" on public.subscribers for insert to anon, authenticated with check (true);
create policy "admin reads subscribers" on public.subscribers for select to authenticated using (public.has_role(auth.uid(), 'admin'));