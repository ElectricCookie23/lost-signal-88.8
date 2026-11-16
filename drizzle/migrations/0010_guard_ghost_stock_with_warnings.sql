CREATE OR REPLACE FUNCTION public.ghost_tick()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE st public.station_state; night boolean; lo integer; hi integer; step integer; delay_seconds integer; p record; v record; area text; lines jsonb := '[]'; sub numeric(10,2):=0; no text; count_items integer;
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
 FOR p IN SELECT * FROM public.products pr WHERE pr.base_stock > 3 AND pr.stock*2 > pr.base_stock
   AND (NOT EXISTS (SELECT 1 FROM public.product_variants x WHERE x.code=pr.code)
        OR EXISTS (SELECT 1 FROM public.product_variants x WHERE x.code=pr.code AND x.stock*2 > x.base_stock AND x.stock>0))
   ORDER BY random() LIMIT count_items FOR UPDATE SKIP LOCKED LOOP
  IF p.base_stock <= 3 OR p.stock*2 <= p.base_stock THEN
   RAISE WARNING 'Ghost sale skipped for %: stock % base % violates stock protection',p.code,p.stock,p.base_stock;
   CONTINUE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.product_variants x WHERE x.code=p.code) THEN
   SELECT * INTO v FROM public.product_variants x WHERE x.code=p.code AND x.stock*2 > x.base_stock AND x.stock>0 ORDER BY random() LIMIT 1 FOR UPDATE;
   IF NOT FOUND THEN
    RAISE WARNING 'Ghost sale skipped for %: no eligible size remains',p.code;
    CONTINUE;
   END IF;
   IF v.stock*2 <= v.base_stock THEN
    RAISE WARNING 'Ghost sale skipped for % size %: stock % base % violates half-stock rule',v.code,v.size,v.stock,v.base_stock;
    CONTINUE;
   END IF;
   UPDATE public.product_variants SET stock=stock-1 WHERE code=v.code AND size=v.size AND stock*2 > base_stock;
   IF NOT FOUND THEN
    RAISE WARNING 'Ghost sale skipped for % size %: stock guard rejected decrement',v.code,v.size;
    CONTINUE;
   END IF;
   lines:=lines||jsonb_build_object('code',p.code,'name',p.name,'price',p.price,'qty',1,'size',v.size);
  ELSE
   UPDATE public.products SET stock=stock-1 WHERE code=p.code AND base_stock>3 AND stock*2 > base_stock;
   IF NOT FOUND THEN
    RAISE WARNING 'Ghost sale skipped for %: stock guard rejected decrement',p.code;
    CONTINUE;
   END IF;
   lines:=lines||jsonb_build_object('code',p.code,'name',p.name,'price',p.price,'qty',1);
  END IF;
  sub:=sub+p.price;
  INSERT INTO public.station_events(kind,code,area) VALUES('sale',p.code,area);
 END LOOP;
 IF jsonb_array_length(lines)=0 THEN RETURN; END IF;
 no:='GHOST-'||replace(gen_random_uuid()::text,'-','');
 INSERT INTO public.orders(order_no,email,items,subtotal,total,subtotal_qar,total_qar,shipping,status,is_ghost) VALUES(no,'ghost@lostsignal.invalid',lines,sub::integer,sub::integer,sub,sub,jsonb_build_object('city',area),'ghost',true);
END $function$;