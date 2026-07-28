import crypto from "node:crypto";
import process from "node:process";

import pg from "pg";

const connectionString = process.env.RETAIL_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("RETAIL_DATABASE_URL or DATABASE_URL is required");
const { Client } = pg;
const tag = `lock-${crypto.randomUUID().replaceAll("-", "")}`;
const sku = `${tag}-v`;
const email = (suffix) => `${tag}-${suffix}@example.test`;
const checkout = (buyer, locale = "en") => JSON.stringify({ email: buyer, recipient: "Lock Test", line1: "1 Lock Way", city: "Test", country: "LC", termsAccepted: true, termsVersion: "lock-v1", locale });
const items = JSON.stringify([{ variantSku: sku, quantity: 1 }]);

async function client() { const value = new Client({ connectionString }); await value.connect(); return value; }
async function attempt(db, sql, values) {
  await db.query("BEGIN");
  try { const result = await db.query(sql, values); await db.query("COMMIT"); return { ok: true, result }; }
  catch (error) { await db.query("ROLLBACK").catch(() => {}); return { ok: false, error }; }
}
async function catalogAttempt(db, productId, sql, values) {
  await db.query("BEGIN");
  try {
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:' || $1::text,0))", [productId]);
    const result = await db.query(sql, values); await db.query("COMMIT"); return { ok: true, result };
  } catch (error) { await db.query("ROLLBACK").catch(() => {}); return { ok: false, error }; }
}
async function catalogCreateAttempt(db, productId, sku, key) {
  await db.query("BEGIN");
  try {
    await db.query("SELECT pg_advisory_xact_lock(hashtextextended('retail.catalog.inventory:' || $1::text,0))", [productId]);
    const inserted = await db.query(`INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values,status)
      VALUES($1,$2,'Catalog variant','متغير كتالوج','目录变体','{"size":"L"}','active') RETURNING id`, [productId, sku]);
    await db.query("INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved) VALUES($1,2,0)", [inserted.rows[0].id]);
    await db.query("INSERT INTO retail_variant_price_history(variant_id,amount_minor,idempotency_key,changed_by) VALUES($1,100,$2::uuid,'concurrency')", [inserted.rows[0].id, key]);
    const result = await db.query("SELECT retail_sync_product_inventory_from_variants($1::uuid)", [productId]);
    await db.query("COMMIT"); return { ok: true, result };
  } catch (error) { await db.query("ROLLBACK").catch(() => {}); return { ok: false, error }; }
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertNoDeadlock(outcomes) { for (const outcome of outcomes) if (!outcome.ok && outcome.error?.code === "40P01") throw outcome.error; }
async function assertProductMirror(db, id) {
  const result = await db.query(`SELECT pb.on_hand product_on_hand,pb.reserved product_reserved,
      COALESCE(sum(vb.on_hand),0)::bigint variant_on_hand,COALESCE(sum(vb.reserved),0)::bigint variant_reserved
    FROM retail_inventory_balances pb
    JOIN retail_product_variants v ON v.product_id=pb.product_id
    JOIN retail_variant_inventory_balances vb ON vb.variant_id=v.id
    WHERE pb.product_id=$1 GROUP BY pb.on_hand,pb.reserved`, [id]);
  const row = result.rows[0];
  assert(row && Number(row.product_on_hand) === Number(row.variant_on_hand) && Number(row.product_reserved) === Number(row.variant_reserved), "product mirror must equal variant sum");
  assert(Number(row.product_on_hand) >= Number(row.product_reserved), "product mirror oversold");
}

const setup = await client();
const a = await client();
const b = await client();
let productId;
let variantId;
try {
  const created = await setup.query(`INSERT INTO retail_products(sku,slug,title_en,title_ar,title_zh,description_en,description_ar,description_zh,status)
    VALUES($1,$2,'Lock product','منتج قفل','锁产品','','','','published') RETURNING id,public_id`, [tag, tag]);
  productId = created.rows[0].id;
  await setup.query("INSERT INTO retail_inventory_balances(product_id,on_hand,reserved) VALUES($1,1,0)", [productId]);
  const variant = await setup.query(`INSERT INTO retail_product_variants(product_id,sku,title_en,title_ar,title_zh,option_values,status)
    VALUES($1,$2,'Lock variant','متغير قفل','锁变体','{}','active') RETURNING id`, [productId, sku]);
  variantId = variant.rows[0].id;
  await setup.query("INSERT INTO retail_variant_inventory_balances(variant_id,on_hand,reserved) VALUES($1,1,0)", [variantId]);
  await setup.query("INSERT INTO retail_price_history(product_id,amount_minor,idempotency_key,changed_by) VALUES($1,100,$2::uuid,'concurrency')", [productId, crypto.randomUUID()]);
  await setup.query("INSERT INTO retail_variant_price_history(variant_id,amount_minor,idempotency_key,changed_by) VALUES($1,100,$2::uuid,'concurrency')", [variantId, crypto.randomUUID()]);
  await setup.query("INSERT INTO retail_shipping_zones(country,name_en,name_ar,name_zh,shipping_minor,tax_rate_bps,active) VALUES('LC','Lock country','بلد القفل','锁国',0,0,true) ON CONFLICT(country) DO NOTHING");

  // Stock contention: both sessions begin independently, then hit the same
  // locked inventory rows. One reservation must win and the loser must be a
  // business rejection, never a deadlock.
  const quote = 100;
  let outcomes = await Promise.all([
    attempt(a, "SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("stock-a")), quote]),
    attempt(b, "SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("stock-b")), quote]),
  ]);
  assertNoDeadlock(outcomes); assert(outcomes.filter((x) => x.ok).length === 1, `stock contention must have exactly one winner (${outcomes.map((x) => x.ok ? "ok" : `${x.error?.code}: ${x.error?.message}`).join(", ")})`);
  let balances = await setup.query("SELECT vb.reserved variant_reserved,pb.reserved product_reserved FROM retail_variant_inventory_balances vb JOIN retail_product_variants v ON v.id=vb.variant_id JOIN retail_inventory_balances pb ON pb.product_id=v.product_id WHERE vb.variant_id=$1", [variantId]);
  assert(Number(balances.rows[0].variant_reserved) === 1 && Number(balances.rows[0].product_reserved) === 1, "stock reservation mirror diverged");
  const winner = outcomes.find((x) => x.ok).result.rows[0].order_id;
  await setup.query("SELECT retail_cancel_order($1,'test cleanup',$2::uuid)", [winner, crypto.randomUUID()]);

  await setup.query("INSERT INTO retail_promotions(code,kind,amount,max_redemptions,active) VALUES($1,'fixed',1,1,true)", [`${tag}-PROMO`]);
  outcomes = await Promise.all([
    attempt(a, "SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,$5)", [crypto.randomUUID(), items, checkout(email("promo-a")), 99, `${tag}-PROMO`]),
    attempt(b, "SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,$5)", [crypto.randomUUID(), items, checkout(email("promo-b")), 99, `${tag}-PROMO`]),
  ]);
  assertNoDeadlock(outcomes); assert(outcomes.filter((x) => x.ok).length === 1, `promotion contention must have exactly one winner (${outcomes.map((x) => x.ok ? "ok" : `${x.error?.code}: ${x.error?.message}`).join(", ")})`);
  const redemptions = await setup.query("SELECT count(*)::int AS n FROM retail_promotion_redemptions WHERE promotion_id=(SELECT id FROM retail_promotions WHERE code=$1) AND status='reserved'", [`${tag}-PROMO`]);
  assert(redemptions.rows[0].n === 1, "promotion redemption count must be one");
  const promoWinner = outcomes.find((x) => x.ok).result.rows[0].order_id;
  // Cancellation and the old product-level adjustment intersect the same
  // mirrors.  Their ordered locks must not emit 40P01 and must leave mirrors equal.
  outcomes = await Promise.all([
    attempt(a, "SELECT retail_cancel_order($1,'concurrency cleanup',$2::uuid)", [promoWinner, crypto.randomUUID()]),
    attempt(b, "SELECT retail_adjust_inventory_as_actor($1::uuid,1,'concurrency adjustment',$2::uuid,'owner','Owner','owner',false)", [created.rows[0].public_id, crypto.randomUUID()]),
  ]);
  assertNoDeadlock(outcomes); assert(outcomes.every((x) => x.ok), "cancel/adjust must both complete");
  balances = await setup.query("SELECT vb.on_hand variant_on_hand,vb.reserved variant_reserved,pb.on_hand product_on_hand,pb.reserved product_reserved FROM retail_variant_inventory_balances vb JOIN retail_product_variants v ON v.id=vb.variant_id JOIN retail_inventory_balances pb ON pb.product_id=v.product_id WHERE vb.variant_id=$1", [variantId]);
  const row = balances.rows[0];
  assert(Number(row.variant_on_hand) === Number(row.product_on_hand) && Number(row.variant_reserved) === Number(row.product_reserved), "final inventory mirror diverged");

  // A denied/approval-reversed PayPal event invokes the legacy-named release
  // function before db.ts changes order status. It must now take variant locks
  // before product mirrors, so it can overlap a new V3 checkout safely.
  const deniedSeed = await setup.query("SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("denied-seed")), 100]);
  const deniedOrder = deniedSeed.rows[0].order_id;
  const paypalOrder = `DENIED-${crypto.randomUUID()}`;
  await setup.query("UPDATE retail_orders SET paypal_order_id=$2 WHERE id=$1", [deniedOrder, paypalOrder]);
  outcomes = await Promise.all([
    attempt(a, "SELECT retail_release_order_reservations($1,'payment_denied')", [paypalOrder]),
    attempt(b, "SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("denied-race")), 100]),
  ]);
  assertNoDeadlock(outcomes); assert(outcomes[0].ok && (outcomes[1].ok || outcomes[1].error?.code === "P0001"), "denied release must complete and checkout may only lose on stock");
  await assertProductMirror(setup, productId);
  if (outcomes[1].ok) await setup.query("SELECT retail_cancel_order($1,'denied race cleanup',$2::uuid)", [outcomes[1].result.rows[0].order_id, crypto.randomUUID()]);
  const reversedSeed = await setup.query("SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("reversed-seed")), 100]);
  const reversedPaypal = `REVERSED-${crypto.randomUUID()}`;
  await setup.query("UPDATE retail_orders SET paypal_order_id=$2,status='created' WHERE id=$1", [reversedSeed.rows[0].order_id, reversedPaypal]);
  outcomes = await Promise.all([
    attempt(a, "SELECT retail_release_order_reservations($1,'payment_approval_reversed')", [reversedPaypal]),
    attempt(b, "SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("reversed-race")), 100]),
  ]);
  assertNoDeadlock(outcomes); assert(outcomes[0].ok && (outcomes[1].ok || outcomes[1].error?.code === "P0001"), "approval reversal release must complete and checkout may only lose on stock");
  await assertProductMirror(setup, productId);
  if (outcomes[1].ok) await setup.query("SELECT retail_cancel_order($1,'reversed race cleanup',$2::uuid)", [outcomes[1].result.rows[0].order_id, crypto.randomUUID()]);

  // A catalogue absolute stock save is an UPDATE followed by a derived-mirror
  // sync inside one transaction. It must serialize with checkout without a
  // stale aggregate overwriting the reservation.
  outcomes = await Promise.all([
    attempt(a, "WITH changed AS (UPDATE retail_variant_inventory_balances SET on_hand=3,updated_at=now() WHERE variant_id=$1 RETURNING variant_id) SELECT retail_sync_product_inventory_from_variants((SELECT product_id FROM retail_product_variants WHERE id=(SELECT variant_id FROM changed)))", [variantId]),
    attempt(b, "SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("absolute-race")), 100]),
  ]);
  assertNoDeadlock(outcomes); assert(outcomes.every((x) => x.ok), "absolute stock save and checkout must both complete");
  await assertProductMirror(setup, productId);
  await setup.query("SELECT retail_cancel_order($1,'absolute race cleanup',$2::uuid)", [outcomes[1].result.rows[0].order_id, crypto.randomUUID()]);

  // Two catalogue mutations run against one product while checkout holds a
  // sellable variant. The new-variant path and absolute update both call the
  // same all-variants-then-product sync routine as catalog-admin.ts.
  const createdVariantSku = `${tag}-catalog`;
  outcomes = await Promise.all([
    catalogCreateAttempt(a, productId, createdVariantSku, crypto.randomUUID()),
    catalogAttempt(b, productId, "WITH changed AS (UPDATE retail_variant_inventory_balances SET on_hand=on_hand+1,updated_at=now() WHERE variant_id=$1 RETURNING variant_id) SELECT retail_sync_product_inventory_from_variants((SELECT product_id FROM retail_product_variants WHERE id=(SELECT variant_id FROM changed)))", [variantId]),
  ]);
  assertNoDeadlock(outcomes); assert(outcomes.every((x) => x.ok), "two catalogue writes must both complete");
  await assertProductMirror(setup, productId);

  outcomes = await Promise.all([
    attempt(a, "SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("catalog-checkout")), 100]),
    catalogAttempt(b, productId, "WITH changed AS (UPDATE retail_variant_inventory_balances SET on_hand=4,updated_at=now() WHERE variant_id=$1 RETURNING variant_id) SELECT retail_sync_product_inventory_from_variants((SELECT product_id FROM retail_product_variants WHERE id=(SELECT variant_id FROM changed)))", [variantId]),
  ]);
  assertNoDeadlock(outcomes); assert(outcomes.every((x) => x.ok), "checkout and catalogue update must both complete");
  await assertProductMirror(setup, productId);
  await setup.query("SELECT retail_cancel_order($1,'catalog checkout cleanup',$2::uuid)", [outcomes[0].result.rows[0].order_id, crypto.randomUUID()]);

  // Representative lifecycle paths use the status trigger and therefore the
  // same ordered release as expiration/capture. Capture consumes both sides;
  // expiry releases both sides and leaves no reservation that can oversell.
  const captureSeed = await setup.query("SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("capture")), 100]);
  const capturePaypal = `CAPTURE-${crypto.randomUUID()}`;
  await setup.query("UPDATE retail_orders SET paypal_order_id=$2 WHERE id=$1", [captureSeed.rows[0].order_id, capturePaypal]);
  const captured = await setup.query("SELECT retail_apply_paypal_capture($1,$2)", [capturePaypal, `CAP-${crypto.randomUUID()}`]);
  assert(captured.rows[0].retail_apply_paypal_capture === true, "capture must consume its reservation");
  await assertProductMirror(setup, productId);
  const capturedLine = await setup.query("SELECT id,variant_id,variant_sku,title_en,title_ar,title_zh,quantity FROM retail_order_lines WHERE order_id=$1", [captureSeed.rows[0].order_id]);
  const returnRow = await setup.query("INSERT INTO retail_returns(order_id,reason,customer_idempotency_key,refund_cap_minor,refund_cap_calculation) VALUES($1,'concurrency restock',$2::uuid,100,'{}'::jsonb) RETURNING id,public_id", [captureSeed.rows[0].order_id, crypto.randomUUID()]);
  await setup.query("INSERT INTO retail_return_lines(return_id,order_line_id,variant_id,variant_sku,title_en,title_ar,title_zh,quantity) VALUES($1,$2,$3,$4,$5,$6,$7,1)", [returnRow.rows[0].id, capturedLine.rows[0].id, capturedLine.rows[0].variant_id, capturedLine.rows[0].variant_sku, capturedLine.rows[0].title_en, capturedLine.rows[0].title_ar, capturedLine.rows[0].title_zh]);
  for (const status of ["authorized", "in_transit", "received", "inspected"]) {
    await setup.query("SELECT * FROM retail_admin_transition_return($1::uuid,$2,'',false,$3::uuid,'worker','Worker','warehouse',false)", [returnRow.rows[0].public_id, status, crypto.randomUUID()]);
  }
  await setup.query("SELECT * FROM retail_admin_transition_return($1::uuid,'approved','sellable',true,$2::uuid,'worker','Worker','warehouse',false)", [returnRow.rows[0].public_id, crypto.randomUUID()]);
  await assertProductMirror(setup, productId);
  const expirySeed = await setup.query("SELECT * FROM retail_create_checkout_v3($1::uuid,$2::jsonb,$3::jsonb,$4,NULL)", [crypto.randomUUID(), items, checkout(email("expiry")), 100]);
  await setup.query("UPDATE retail_variant_inventory_reservations SET expires_at=now()-interval '1 minute' WHERE order_id=$1", [expirySeed.rows[0].order_id]);
  await setup.query("UPDATE retail_inventory_reservations SET expires_at=now()-interval '1 minute' WHERE order_id=$1", [expirySeed.rows[0].order_id]);
  const expired = await setup.query("SELECT retail_release_expired_reservations() AS released");
  assert(Number(expired.rows[0].released) >= 1, "expiry must release the seeded order");
  await assertProductMirror(setup, productId);
  console.log("retail V3 concurrency integration: passed");
} finally {
  if (productId) await setup.query("DELETE FROM retail_products WHERE id=$1", [productId]).catch(() => {});
  await Promise.all([a.end(), b.end(), setup.end()]);
}
