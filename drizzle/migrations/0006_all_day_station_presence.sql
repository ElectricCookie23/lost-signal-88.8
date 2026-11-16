ALTER TABLE public.orders ADD COLUMN is_ghost boolean NOT NULL DEFAULT false;
ALTER TABLE public.station_state ADD COLUMN ghost_listeners integer NOT NULL DEFAULT 6;
ALTER TABLE public.station_state ADD COLUMN listeners_updated_at timestamptz NOT NULL DEFAULT now();
CREATE OR REPLACE FUNCTION public.station_audience() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT ghost_listeners FROM public.station_state WHERE id=1 $$;
REVOKE ALL ON FUNCTION public.station_audience() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.station_audience() TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.ghost_tick() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st public.station_state; night boolean; lo integer; hi integer; step integer; delay_seconds integer; p record; area text; lines jsonb := '[]'; sub numeric(10,2):=0; no text; count_items integer;
BEGIN
 SELECT * INTO st FROM public.station_state WHERE id=1 FOR UPDATE;
 night := extract(hour FROM now() AT TIME ZONE 'Asia/Qatar') >= 20 OR extract(hour FROM now() AT TIME ZONE 'Asia/Qatar') < 6;
 lo:=CASE WHEN night THEN 12 ELSE 4 END; hi:=CASE WHEN night THEN 30 ELSE 9 END;
 IF st.listeners_updated_at <= now()-interval '1 minute' THEN
  step:=1+floor(random()*2)::integer;
  UPDATE public.station_state SET ghost_listeners=CASE WHEN st.ghost_listeners<lo THEN least(lo,st.ghost_listeners+step) WHEN st.ghost_listeners>hi THEN greatest(hi,st.ghost_listeners-step) ELSE greatest(lo,least(hi,st.ghost_listeners+(CASE WHEN random()<0.5 THEN -step ELSE step END))) END, listeners_updated_at=now() WHERE id=1;
 END IF;
 IF st.next_ghost_at>now() THEN RETURN; END IF;
 delay_seconds:=CASE WHEN night THEN 120+floor(random()*181)::integer ELSE 360+floor(random()*361)::integer END;
 UPDATE public.station_state SET next_ghost_at=now()+delay_seconds*interval '1 second' WHERE id=1;
 area:=(ARRAY['Al Sadd','West Bay','Msheireb','Al Wakra','Lusail','The Pearl','Education City','Old Airport'])[1+floor(random()*8)::integer];
 count_items:=1+floor(random()*2)::integer;
 FOR p IN SELECT * FROM public.products WHERE stock-1 >= ceil(base_stock/2.0) AND stock>0 ORDER BY random() LIMIT count_items FOR UPDATE SKIP LOCKED LOOP
  UPDATE public.products SET stock=stock-1 WHERE code=p.code;
  lines:=lines||jsonb_build_object('code',p.code,'name',p.name,'price',p.price,'qty',1); sub:=sub+p.price;
  INSERT INTO public.station_events(kind,code,area) VALUES('sale',p.code,area);
 END LOOP;
 IF jsonb_array_length(lines)=0 THEN RETURN; END IF;
 no:='GHOST-'||replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.orders(order_no,email,items,subtotal,total,subtotal_qar,total_qar,shipping,status,is_ghost) VALUES(no,'ghost@lostsignal.invalid',lines,sub::integer,sub::integer,sub,sub,jsonb_build_object('city',area),'ghost',true);
END $$;
REVOKE ALL ON FUNCTION public.ghost_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ghost_tick() TO service_role;
CREATE OR REPLACE FUNCTION public.guest_orders(p_ids uuid[]) RETURNS SETOF public.orders LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT * FROM public.orders WHERE id=any(p_ids[1:50]) AND user_id IS NULL AND NOT is_ghost ORDER BY created_at DESC $$;
ALTER POLICY "own orders read" ON public.orders USING (user_id=auth.uid() AND NOT is_ghost);
ALTER POLICY "own orders insert" ON public.orders WITH CHECK (user_id=auth.uid() AND NOT is_ghost);