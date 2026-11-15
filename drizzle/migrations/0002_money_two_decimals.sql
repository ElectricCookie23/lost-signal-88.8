alter table public.orders
  add column subtotal_qar numeric(10,2) not null default 0,
  add column discount_qar numeric(10,2) not null default 0,
  add column total_qar numeric(10,2) not null default 0;
update public.orders set subtotal_qar = subtotal, discount_qar = discount, total_qar = total;
comment on column public.orders.subtotal is 'DEPRECATED: replaced by subtotal_qar';
comment on column public.orders.discount is 'DEPRECATED: replaced by discount_qar';
comment on column public.orders.total is 'DEPRECATED: replaced by total_qar';

create or replace function public.place_order(p_items jsonb, p_email text, p_shipping jsonb, p_kicked boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  it jsonb; c text; q int; pr record;
  short jsonb := '[]'::jsonb; lines jsonb := '[]'::jsonb;
  sub numeric(10,2) := 0; disc numeric(10,2); no text; o public.orders; city text;
begin
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 254 then
    raise exception 'Invalid email';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 16 then
    raise exception 'Empty cart';
  end if;
  city := left(coalesce(p_shipping->>'city', ''), 80);

  for it in select * from jsonb_array_elements(p_items) loop
    c := it->>'code'; q := (it->>'qty')::int;
    if q is null or q < 1 or q > 99 then raise exception 'Bad quantity'; end if;
    select code, name, price, stock into pr from public.products where code = c for update;
    if not found then raise exception 'Unknown product %', c; end if;
    if pr.stock < q then
      short := short || jsonb_build_object('code', c, 'stock', pr.stock);
    else
      lines := lines || jsonb_build_object('code', c, 'name', pr.name, 'price', round(pr.price::numeric, 2), 'qty', q);
      sub := sub + pr.price * q;
    end if;
  end loop;

  if jsonb_array_length(short) > 0 then
    return jsonb_build_object('ok', false, 'short', short);
  end if;

  disc := case when p_kicked then round(sub * 0.1, 2) else 0 end;
  loop
    no := 'LS-' || lpad((floor(random() * 100000))::int::text, 5, '0');
    exit when not exists (select 1 from public.orders where order_no = no);
  end loop;

  for it in select * from jsonb_array_elements(lines) loop
    update public.products set stock = stock - (it->>'qty')::int where code = it->>'code';
    insert into public.station_events (kind, code, area) values ('sale', it->>'code', nullif(city, ''));
  end loop;

  insert into public.orders (order_no, user_id, email, items, subtotal, discount, total,
    subtotal_qar, discount_qar, total_qar, shipping, status)
  values (no, auth.uid(), lower(p_email), lines, round(sub)::int, round(disc)::int, round(sub - disc)::int,
    sub, disc, sub - disc,
    jsonb_build_object(
      'name', left(coalesce(p_shipping->>'name',''), 100),
      'address', left(coalesce(p_shipping->>'address',''), 200),
      'city', city,
      'country', left(coalesce(p_shipping->>'country',''), 80)),
    'held')
  returning * into o;

  return jsonb_build_object('ok', true, 'order', to_jsonb(o));
end $$;
grant execute on function public.place_order(jsonb, text, jsonb, boolean) to anon, authenticated;