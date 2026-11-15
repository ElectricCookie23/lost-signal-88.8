
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- products
create table public.products (
  code text primary key,
  name text not null,
  price integer not null,
  tag text,
  description text not null default '',
  stock integer not null default 0 check (stock >= 0),
  base_stock integer not null default 0,
  sort_order integer not null default 0
);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "anyone reads products" on public.products for select to anon, authenticated using (true);

insert into public.products (code, name, price, tag, description, stock, base_stock, sort_order) values
('A1','Dead Air Vol. 1',45,'DJ pick','Ninety minutes recorded live between 2 and 4am, when the station thought nobody was listening. Includes the part where DJ Static falls asleep on the mic.',12,12,1),
('A2','Blank Tapes 5-Pack',35,null,'Five empty cassettes for your own bootlegs. What you record on them stays between you and the signal police.',30,30,2),
('A3','Nightwalker Cassette Player',189,null,'A pocket tape player with an orange backlit window and a belt clip. Auto-reverse, because flipping a tape at 3am is too much effort.',2,2,3),
('A4','Rewind Pen',15,null,'The pencil trick, upgraded. A pen with a hex end that fits any cassette spool. Writes and rewinds.',40,40,4),
('B1','88.8 Station Hoodie',220,'DJ pick','Heavyweight black hoodie with the frequency on the chest, a tuning dial down the sleeve and the broadcast schedule on the back.',8,8,5),
('B2','Off Air Cap',95,null,'Orange cap embroidered with OFF AIR. For the daytime, when you''re technically not here.',14,14,6),
('B3','Night Crew Jacket',340,'Bootleg','Black work jacket with a reflective NIGHT CREW strip across the back. Built for rooftops in winter.',3,3,7),
('B4','Signal Socks 2-Pack',40,null,'One pair in static grey, one in signal teal. They don''t match. That''s the point.',25,25,8),
('C1','Pocket Receiver',149,'DJ pick','A matchbox-sized radio pre-tuned to 88.8. It picks up other stations too, but we don''t recommend them.',6,6,9),
('C2','Antenna Keychain',25,null,'A chrome antenna that extends to 30cm. Does it improve reception? No. Will people ask about it? Every time.',50,50,10),
('C3','Booth Headphones',260,null,'Closed-back headphones with a coiled cable long enough to reach the window when the DJ needs air.',4,4,11),
('C4','ON AIR Lamp',175,null,'The same red light that hangs over our booth door. Plug it in and nobody walks into your room without knocking.',1,1,12),
('D1','Interference Sticker Sheet',20,null,'Stickers of the frequency, the radio, the machine and a cassette. Stick them where they shouldn''t be.',60,60,13),
('D2','Rooftop Session 004 Poster',60,'Bootleg','Riso print from the one night we broadcast live with a full band. The building manager still doesn''t know.',5,5,14),
('D3','Static Zine Issue 7',30,null,'Photocopied pages of listener letters, the best 3am call-ins, and how to build an antenna out of a coat hanger.',20,20,15),
('D4','Frequency Map',85,null,'A map of the city showing where 88.8 comes in clear, where it fades, and the one parking lot where it''s perfect.',10,10,16);

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

-- admin emails (private; no API access)
create table public.admin_emails (email text primary key);
grant all on public.admin_emails to service_role;
alter table public.admin_emails enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict do nothing;
  if exists (select 1 from public.admin_emails where lower(email) = lower(new.email)) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- cart / saved
create table public.cart_items (
  user_id uuid not null,
  code text not null references public.products(code),
  qty integer not null check (qty > 0),
  primary key (user_id, code)
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "own cart" on public.cart_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.saved_items (
  user_id uuid not null,
  code text not null references public.products(code),
  primary key (user_id, code)
);
grant select, insert, update, delete on public.saved_items to authenticated;
grant all on public.saved_items to service_role;
alter table public.saved_items enable row level security;
create policy "own saved" on public.saved_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid,
  email text not null,
  items jsonb not null default '[]',
  subtotal integer not null default 0,
  discount integer not null default 0,
  total integer not null default 0,
  shipping jsonb not null default '{}',
  status text not null default 'held',
  created_at timestamptz not null default now()
);
grant select, insert on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "own orders insert" on public.orders for insert to authenticated with check (user_id = auth.uid());

-- restock alerts
create table public.restock_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  code text not null references public.products(code),
  created_at timestamptz not null default now(),
  notified boolean not null default false
);
grant insert on public.restock_alerts to anon, authenticated;
grant select on public.restock_alerts to authenticated;
grant all on public.restock_alerts to service_role;
alter table public.restock_alerts enable row level security;
create policy "anyone joins list" on public.restock_alerts for insert to anon, authenticated with check (notified = false);
create policy "admin reads alerts" on public.restock_alerts for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- station events
create table public.station_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sale','restock')),
  code text not null references public.products(code),
  area text,
  created_at timestamptz not null default now()
);
grant select on public.station_events to anon, authenticated;
grant all on public.station_events to service_role;
alter table public.station_events enable row level security;
create policy "anyone reads events" on public.station_events for select to anon, authenticated using (true);

alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.station_events;

-- admin stock tools
create or replace function public.admin_set_stock(_code text, _stock integer)
returns void language plpgsql security definer set search_path = public as $$
declare old integer;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  select stock into old from public.products where code = _code for update;
  update public.products set stock = greatest(0, _stock) where code = _code;
  if old = 0 and _stock > 0 then
    insert into public.station_events (kind, code) values ('restock', _code);
  end if;
end $$;

create or replace function public.refill_all()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.station_events (kind, code)
  select 'restock', code from public.products where stock < base_stock;
  update public.products set stock = base_stock where stock <> base_stock;
end $$;

create or replace function public.admin_restock_all()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  perform public.refill_all();
end $$;
revoke execute on function public.refill_all() from public, anon, authenticated;

-- ghost listeners
create table public.station_state (id integer primary key default 1, next_ghost_at timestamptz not null default now());
grant all on public.station_state to service_role;
alter table public.station_state enable row level security;
insert into public.station_state default values;

create or replace function public.ghost_tick()
returns void language plpgsql security definer set search_path = public as $$
declare pick text; areas text[] := array['Al Sadd','West Bay','Msheireb','Al Wakra','Lusail','The Pearl','Education City','Old Airport'];
begin
  if (select next_ghost_at from public.station_state where id = 1) > now() then return; end if;
  update public.station_state set next_ghost_at = now() + (180 + floor(random() * 181)) * interval '1 second' where id = 1;
  select code into pick from public.products where stock > 3 order by random() limit 1;
  if pick is null then return; end if;
  update public.products set stock = stock - 1 where code = pick;
  insert into public.station_events (kind, code, area) values ('sale', pick, areas[1 + floor(random() * 8)::int]);
end $$;
revoke execute on function public.ghost_tick() from public, anon, authenticated;
