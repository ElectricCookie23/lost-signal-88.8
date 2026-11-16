CREATE TABLE public.product_variants(code text NOT NULL REFERENCES public.products(code), size text NOT NULL, stock integer NOT NULL DEFAULT 0 CHECK(stock>=0), base_stock integer NOT NULL DEFAULT 0 CHECK(base_stock>=0), PRIMARY KEY(code,size));
GRANT SELECT ON public.product_variants TO anon,authenticated; GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public variant stock" ON public.product_variants FOR SELECT TO anon,authenticated USING(true);
INSERT INTO public.product_variants(code,size,stock,base_stock) SELECT p.code,s.size, p.stock/n.c + CASE WHEN s.ord <= p.stock%n.c THEN 1 ELSE 0 END,p.base_stock/n.c + CASE WHEN s.ord <= p.base_stock%n.c THEN 1 ELSE 0 END FROM public.products p CROSS JOIN LATERAL (SELECT CASE WHEN p.code='B4' THEN 2 ELSE 4 END AS c) n CROSS JOIN LATERAL unnest(CASE WHEN p.code='B4' THEN ARRAY['S/M','L/XL'] ELSE ARRAY['S','M','L','XL'] END) WITH ORDINALITY s(size,ord) WHERE p.code IN ('B1','B3','B4');
CREATE TABLE public.shopping_cart(user_id uuid NOT NULL, line_key text NOT NULL, qty integer NOT NULL CHECK(qty>0 AND qty<=99), PRIMARY KEY(user_id,line_key));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.shopping_cart TO authenticated; GRANT ALL ON public.shopping_cart TO service_role;
ALTER TABLE public.shopping_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own size cart" ON public.shopping_cart FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
INSERT INTO public.shopping_cart SELECT user_id,code,qty FROM public.cart_items WHERE code NOT IN ('B1','B3','B4');
COMMENT ON TABLE public.cart_items IS 'DEPRECATED: replaced by shopping_cart for size-aware line keys';
CREATE TABLE public.mystery_claims(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), visit uuid NOT NULL UNIQUE, code text NOT NULL REFERENCES public.products(code), size text, used boolean NOT NULL DEFAULT false);
GRANT ALL ON public.mystery_claims TO service_role;
ALTER TABLE public.mystery_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ADD COLUMN dedication jsonb NOT NULL DEFAULT '{}', ADD COLUMN promotions jsonb NOT NULL DEFAULT '[]';
CREATE OR REPLACE FUNCTION public.dead_hours(t timestamptz DEFAULT now()) RETURNS boolean LANGUAGE sql STABLE SET search_path=public AS $$ SELECT extract(hour FROM t AT TIME ZONE 'Asia/Qatar')>=2 AND extract(hour FROM t AT TIME ZONE 'Asia/Qatar')<4 $$;
CREATE OR REPLACE FUNCTION public.mystery_drop(p_visit uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE p record; v text; m public.mystery_claims; BEGIN SELECT * INTO m FROM public.mystery_claims WHERE visit=p_visit; IF FOUND THEN RETURN jsonb_build_object('id',m.id,'code',m.code,'size',m.size,'used',m.used); END IF; SELECT * INTO p FROM public.products WHERE stock>0 ORDER BY random() LIMIT 1; IF NOT FOUND THEN RAISE EXCEPTION 'Sold out'; END IF; IF p.code IN ('B1','B3','B4') THEN SELECT size INTO v FROM public.product_variants WHERE code=p.code AND stock>0 ORDER BY random() LIMIT 1; IF v IS NULL THEN RAISE EXCEPTION 'Sold out'; END IF; END IF; INSERT INTO public.mystery_claims(visit,code,size) VALUES(p_visit,p.code,v) RETURNING * INTO m; RETURN jsonb_build_object('id',m.id,'code',m.code,'size',m.size,'used',false); END $$;
REVOKE ALL ON FUNCTION public.mystery_drop(uuid) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.mystery_drop(uuid) TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.sync_variant_total() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN UPDATE public.products SET stock=(SELECT coalesce(sum(stock),0) FROM public.product_variants WHERE code=NEW.code) WHERE code=NEW.code; RETURN NEW; END $$;
CREATE TRIGGER variant_total AFTER UPDATE OF stock ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.sync_variant_total();
CREATE OR REPLACE FUNCTION public.rebalance_variants() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN IF pg_trigger_depth()>1 THEN RETURN NEW; END IF; SELECT count(*) INTO n FROM public.product_variants WHERE code=NEW.code; IF n>0 THEN UPDATE public.product_variants v SET stock=NEW.stock/n+CASE WHEN (SELECT count(*) FROM public.product_variants z WHERE z.code=v.code AND z.size<=v.size)<=NEW.stock%n THEN 1 ELSE 0 END WHERE v.code=NEW.code; END IF; RETURN NEW; END $$;
CREATE TRIGGER product_variant_balance AFTER UPDATE OF stock ON public.products FOR EACH ROW EXECUTE FUNCTION public.rebalance_variants();
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
CREATE OR REPLACE FUNCTION public.place_order(p_items jsonb,p_email text,p_shipping jsonb,p_kicked boolean,p_secret boolean,p_dedication jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE it jsonb; part text; c text; sz text; q integer; pr public.products; v public.product_variants; m public.mystery_claims; lines jsonb:='[]'; short jsonb:='[]'; sub numeric(10,2):=0; disc numeric(10,2):=0; amt numeric(10,2); pct numeric; dead boolean:=public.dead_hours(); promos jsonb:='[]'; no text; o public.orders; claim_id uuid;
BEGIN
 IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_email)>254 THEN RAISE EXCEPTION 'Invalid email'; END IF;
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 OR jsonb_array_length(p_items)>64 THEN RAISE EXCEPTION 'Invalid cart'; END IF;
 IF length(coalesce(p_dedication->>'message',''))>120 OR length(coalesce(p_dedication->>'to',''))>100 THEN RAISE EXCEPTION 'Invalid dedication'; END IF;
 -- Lock every affected product and variant in stable order before stock validation.
 PERFORM 1 FROM public.products ORDER BY code FOR UPDATE;
 PERFORM 1 FROM public.product_variants ORDER BY code,size FOR UPDATE;
 FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
  c:=it->>'code'; sz:=nullif(it->>'size',''); q:=(it->>'qty')::integer;
  IF q IS NULL OR q<1 OR q>99 THEN RAISE EXCEPTION 'Bad quantity'; END IF;
  IF c='KIT' THEN
   IF sz IS NULL THEN RAISE EXCEPTION 'Pick a hoodie size'; END IF;
   FOREACH part IN ARRAY ARRAY['A1','B1','C1'] LOOP
    SELECT * INTO pr FROM public.products WHERE code=part;
    IF part='B1' THEN SELECT * INTO v FROM public.product_variants WHERE code=part AND size=sz; IF NOT FOUND THEN RAISE EXCEPTION 'Invalid size'; END IF; IF v.stock<q THEN short:=short||jsonb_build_object('code',c,'stock',v.stock); END IF; UPDATE public.product_variants SET stock=greatest(0,stock-q) WHERE code=part AND size=sz;
    ELSE IF pr.stock<q THEN short:=short||jsonb_build_object('code',c,'stock',pr.stock); END IF; UPDATE public.products SET stock=greatest(0,stock-q) WHERE code=part; END IF;
    INSERT INTO public.station_events(kind,code,area) VALUES('sale',part,left(p_shipping->>'city',80));
   END LOOP;
   amt:=349*q; pct:=least(0.25,(CASE WHEN dead THEN 0.15 ELSE 0 END)+(CASE WHEN p_kicked THEN 0.10 ELSE 0 END));
   lines:=lines||jsonb_build_object('code','KIT','name','Night Shift Kit','size',sz,'price',349,'qty',q,'components',jsonb_build_array('B1','A1','C1'));
  ELSE
   SELECT * INTO pr FROM public.products WHERE code=c; IF NOT FOUND THEN RAISE EXCEPTION 'Unknown product'; END IF;
   IF c IN ('B1','B3','B4') THEN SELECT * INTO v FROM public.product_variants WHERE code=c AND size=sz; IF NOT FOUND THEN RAISE EXCEPTION 'Pick a valid size'; END IF; IF v.stock<q THEN short:=short||jsonb_build_object('code',c,'stock',v.stock); END IF; UPDATE public.product_variants SET stock=greatest(0,stock-q) WHERE code=c AND size=sz;
   ELSE IF pr.stock<q THEN short:=short||jsonb_build_object('code',c,'stock',pr.stock); END IF; UPDATE public.products SET stock=greatest(0,stock-q) WHERE code=c; END IF;
   pct:=least(0.25,(CASE WHEN dead THEN 0.15 ELSE 0 END)+(CASE WHEN p_kicked THEN 0.10 ELSE 0 END));
   claim_id:=nullif(it->>'mystery','')::uuid;
   IF claim_id IS NOT NULL THEN
    SELECT * INTO m FROM public.mystery_claims WHERE id=claim_id AND NOT used FOR UPDATE;
    IF NOT FOUND OR m.code<>c OR m.size IS DISTINCT FROM sz OR q<>1 THEN RAISE EXCEPTION 'Invalid mystery claim'; END IF;
    UPDATE public.mystery_claims SET used=true WHERE id=claim_id; pct:=least(0.25,pct+0.20);
   END IF;
   amt:=pr.price*q;
   lines:=lines||jsonb_build_object('code',c,'name',pr.name,'size',sz,'price',pr.price,'qty',q,'mystery',claim_id);
   INSERT INTO public.station_events(kind,code,area) VALUES('sale',c,left(p_shipping->>'city',80));
  END IF;
  sub:=sub+amt; disc:=disc+round(amt*pct,2);
 END LOOP;
 IF jsonb_array_length(short)>0 THEN RAISE EXCEPTION 'Stock changed: %',short USING ERRCODE='P0001'; END IF;
 IF dead THEN promos:=promos||jsonb_build_object('label','DEAD HOURS −15%'); END IF;
 IF p_kicked THEN promos:=promos||jsonb_build_object('label','KICKIT −10%'); END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) x WHERE x->>'mystery' IS NOT NULL) THEN promos:=promos||jsonb_build_object('label','MYSTERY −20%'); END IF;
 IF p_secret THEN lines:=lines||jsonb_build_object('code','D1','name','Interference Sticker Sheet','price',0,'qty',1,'bonus','SECRET CODE BONUS'); END IF;
 no:='LS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
 INSERT INTO public.orders(order_no,user_id,email,items,subtotal,discount,total,subtotal_qar,discount_qar,total_qar,shipping,status,dedication,promotions) VALUES(no,auth.uid(),lower(p_email),lines,round(sub)::integer,round(disc)::integer,round(sub-disc)::integer,sub,disc,sub-disc,p_shipping,'held',coalesce(p_dedication,'{}'),promos) RETURNING * INTO o;
 RETURN jsonb_build_object('ok',true,'order',to_jsonb(o));
END $$;
REVOKE ALL ON FUNCTION public.place_order(jsonb,text,jsonb,boolean,boolean,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text,jsonb,boolean,boolean,jsonb) TO anon,authenticated;