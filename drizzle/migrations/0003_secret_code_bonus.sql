create or replace function public.place_order(p_items jsonb, p_email text, p_shipping jsonb, p_kicked boolean, p_secret boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; o public.orders;
begin
  r := public.place_order(p_items, p_email, p_shipping, p_kicked);
  if not p_secret or not (r->>'ok')::boolean then return r; end if;
  update public.orders
     set items = items || jsonb_build_object('code', 'D1', 'name', 'Interference Sticker Sheet', 'price', 0, 'qty', 1, 'bonus', 'SECRET CODE BONUS')
   where id = (r->'order'->>'id')::uuid
  returning * into o;
  return jsonb_build_object('ok', true, 'order', to_jsonb(o));
end $$;
grant execute on function public.place_order(jsonb, text, jsonb, boolean, boolean) to anon, authenticated;