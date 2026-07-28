\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE p UUID; eligible UUID; other UUID; q RECORD; c RECORD; eligible_discount BIGINT; other_discount BIGINT;
BEGIN
  INSERT INTO retail_products(sku,slug,title_en,title_ar,title_zh,description_en,description_ar,description_zh,status) VALUES('PLA-BASE','pla-base','Base','Base','Base','','','','published') RETURNING id INTO p;
  INSERT INTO retail_inventory_balances(product_id,on_hand,reserved) VALUES(p,30,0);
  INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values) VALUES(p,'PLA-ELIGIBLE','Eligible','Eligible','Eligible','{}') RETURNING id INTO eligible;
  INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values) VALUES(p,'PLA-OTHER','Other','Other','Other','{"kind":"other"}') RETURNING id INTO other;
  INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved) VALUES(eligible,10,0),(other,10,0);
  INSERT INTO retail_variant_price_history(variant_id,amount_minor,active,idempotency_key,changed_by) VALUES(eligible,101,true,'b3100000-0000-4000-8000-000000000001','test'),(other,100,true,'b3100000-0000-4000-8000-000000000002','test');
  INSERT INTO retail_shipping_zones(country,name_en,name_ar,name_zh,shipping_minor,tax_rate_bps,active) VALUES('PL','Promotion lines','Promotion lines','Promotion lines',25,0,true);
  INSERT INTO retail_promotions(code,kind,amount,scope) VALUES('PLA25','percent',2500,'{"variantSkus":["PLA-ELIGIBLE"]}');
  SELECT * INTO q FROM retail_quote_checkout_v3('[{"variantSku":"PLA-ELIGIBLE","quantity":2},{"variantSku":"PLA-OTHER","quantity":1}]','{"email":"allocation@example.test","recipient":"Buyer","line1":"One","city":"PL","country":"PL","termsAccepted":true,"termsVersion":"v3","locale":"en"}','PLA25');
  IF q.subtotal_minor<>302 OR q.discount_minor<>51 OR q.total_minor<>276 THEN RAISE EXCEPTION 'scoped percent quote incorrect: %',row_to_json(q); END IF;
  IF (SELECT (x->>'discountMinor')::BIGINT FROM jsonb_array_elements(q.items_snapshot) x WHERE x->>'variantSku'='PLA-ELIGIBLE')<>51 OR (SELECT (x->>'discountMinor')::BIGINT FROM jsonb_array_elements(q.items_snapshot) x WHERE x->>'variantSku'='PLA-OTHER')<>0 THEN RAISE EXCEPTION 'scoped allocation crossed lines: %',q.items_snapshot; END IF;
  SELECT * INTO c FROM retail_create_checkout_v3('b3100000-0000-4000-8000-000000000010','[{"variantSku":"PLA-ELIGIBLE","quantity":2},{"variantSku":"PLA-OTHER","quantity":1}]','{"email":"allocation@example.test","recipient":"Buyer","line1":"One","city":"PL","country":"PL","termsAccepted":true,"termsVersion":"v3","locale":"en"}',276,'PLA25');
  SELECT discount_minor INTO eligible_discount FROM retail_order_lines WHERE order_id=c.order_id AND variant_sku='PLA-ELIGIBLE'; SELECT discount_minor INTO other_discount FROM retail_order_lines WHERE order_id=c.order_id AND variant_sku='PLA-OTHER';
  IF eligible_discount<>51 OR other_discount<>0 OR eligible_discount+other_discount<>c.discount_minor THEN RAISE EXCEPTION 'persisted allocation mismatch: %, %, %',eligible_discount,other_discount,c.discount_minor; END IF;
  INSERT INTO retail_promotions(code,kind,amount,minimum_subtotal_minor,scope) VALUES
    ('PLAFIX','fixed',500,0,'{"variantSkus":["PLA-ELIGIBLE"]}'),
    ('PLASHIP','free_shipping',0,0,'{"variantSkus":["PLA-ELIGIBLE"]}'),
    ('PLAMIN','percent',1000,150,'{"variantSkus":["PLA-ELIGIBLE"]}');
  SELECT * INTO q FROM retail_quote_checkout_v3('[{"variantSku":"PLA-ELIGIBLE","quantity":1},{"variantSku":"PLA-OTHER","quantity":1}]','{"email":"fixed@example.test","recipient":"Buyer","line1":"One","city":"PL","country":"PL","termsAccepted":true,"termsVersion":"v3","locale":"en"}','PLAFIX');
  IF q.discount_minor<>101 OR q.total_minor<>125 THEN RAISE EXCEPTION 'scoped fixed cap incorrect: %',row_to_json(q); END IF;
  SELECT * INTO q FROM retail_quote_checkout_v3('[{"variantSku":"PLA-ELIGIBLE","quantity":1},{"variantSku":"PLA-OTHER","quantity":1}]','{"email":"ship@example.test","recipient":"Buyer","line1":"One","city":"PL","country":"PL","termsAccepted":true,"termsVersion":"v3","locale":"en"}','PLASHIP');
  IF q.discount_minor<>25 OR (SELECT sum((x->>'discountMinor')::BIGINT) FROM jsonb_array_elements(q.items_snapshot) x)<>0 THEN RAISE EXCEPTION 'free shipping must not discount lines: %',row_to_json(q); END IF;
  SELECT * INTO q FROM retail_quote_checkout_v3('[{"variantSku":"PLA-OTHER","quantity":1}]','{"email":"unscoped@example.test","recipient":"Buyer","line1":"One","city":"PL","country":"PL","termsAccepted":true,"termsVersion":"v3","locale":"en"}','PLASHIP');
  IF q.discount_minor<>0 OR q.total_minor<>125 THEN RAISE EXCEPTION 'unmatched free shipping scope discounted the order: %',row_to_json(q); END IF;
  SELECT * INTO q FROM retail_quote_checkout_v3('[{"variantSku":"PLA-ELIGIBLE","quantity":1},{"variantSku":"PLA-OTHER","quantity":1}]','{"email":"minimum@example.test","recipient":"Buyer","line1":"One","city":"PL","country":"PL","termsAccepted":true,"termsVersion":"v3","locale":"en"}','PLAMIN');
  IF q.subtotal_minor<>201 OR q.discount_minor<>10 OR (SELECT (x->>'discountMinor')::BIGINT FROM jsonb_array_elements(q.items_snapshot) x WHERE x->>'variantSku'='PLA-OTHER')<>0 THEN RAISE EXCEPTION 'scoped minimum threshold changed whole-cart eligibility: %',row_to_json(q); END IF;
END $$;
ROLLBACK;
