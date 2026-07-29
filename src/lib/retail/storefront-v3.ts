import "server-only";

import { guardedRetailSql, type RetailSql } from "./database-identity";

type Sql = RetailSql;

export type StorefrontV3Variant = {
  sku: string;
  title_en: string;
  title_ar: string;
  title_zh: string;
  option_values: Record<string, string>;
  amount_minor: number;
  available: number;
  style_public_id?: string | null;
  style_code?: string | null;
  style_title_en?: string | null;
  style_title_ar?: string | null;
  style_title_zh?: string | null;
  style_option_values?: Record<string, string> | null;
  style_position?: number | null;
  style_image_url?: string | null;
};

export type StorefrontV3Product = {
  sku: string;
  slug: string;
  title_en: string;
  title_ar: string;
  title_zh: string | null;
  description_en: string;
  description_ar: string;
  description_zh: string | null;
  images: Array<{ url: string }>;
  variants: StorefrontV3Variant[];
};

export type StorefrontV3Quote = {
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  discountMinor: number;
  totalMinor: number;
  shippingMethod: "standard";
  items: unknown;
  shipping: unknown;
  quoteHash: string;
  promotionCode: string | null;
};

export type StorefrontV3CartItem = { variantSku: string; quantity: number };

function sql(): Sql {
  return guardedRetailSql();
}

/**
 * The storefront deliberately reads price and availability per variant. Product
 * level balances are only a V2 compatibility mirror and are never a sales key.
 */
export async function listStorefrontV3Products(): Promise<StorefrontV3Product[]> {
  try {
    const rows = await sql()`
      SELECT p.sku,p.slug,p.title_en,p.title_ar,p.title_zh,p.description_en,p.description_ar,p.description_zh,
        COALESCE((
          SELECT json_agg(json_build_object('url',image.blob_url) ORDER BY image.position)
          FROM retail_product_images image WHERE image.product_id=p.id
        ), '[]'::json) AS images,
        COALESCE((
          SELECT json_agg(json_build_object(
            'sku',v.sku,'title_en',v.title_en,'title_ar',v.title_ar,'title_zh',v.title_zh,
            'option_values',v.option_values,'amount_minor',price.amount_minor,
            'available',balance.on_hand-balance.reserved,
            'style_public_id',style.public_id,'style_code',style.code,
            'style_title_en',style.title_en,'style_title_ar',style.title_ar,'style_title_zh',style.title_zh,
            'style_option_values',style.option_values,'style_position',style.position,
            'style_image_url',style_image.blob_url
          ) ORDER BY v.sku)
          FROM retail_product_variants v
          JOIN retail_product_styles style ON style.id=v.style_id AND style.status='active'
          LEFT JOIN retail_product_images style_image ON style_image.id=style.primary_image_id
          JOIN retail_variant_inventory_balances balance ON balance.variant_id=v.id
          JOIN LATERAL (
            SELECT amount_minor FROM retail_variant_price_history
            WHERE variant_id=v.id AND active=true ORDER BY created_at DESC LIMIT 1
          ) price ON true
          WHERE v.product_id=p.id AND v.status='active'
        ), '[]'::json) AS variants
      FROM retail_products p
      WHERE p.status='published'
        AND EXISTS (
          SELECT 1 FROM retail_product_images image WHERE image.product_id=p.id
        )
        AND EXISTS (
          SELECT 1 FROM retail_product_variants v
          JOIN retail_variant_inventory_balances balance ON balance.variant_id=v.id
          JOIN retail_variant_price_history price ON price.variant_id=v.id AND price.active=true
          WHERE v.product_id=p.id AND v.status='active' AND balance.on_hand>balance.reserved
        )
      ORDER BY p.sku
    `;
    return rows as StorefrontV3Product[];
  } catch {
    // An unavailable database must not make a public shop route leak internals.
    return [];
  }
}

/** Public PDP loader. Draft products and inactive styles are never exposed. */
export async function getStorefrontV3ProductBySlug(slug: string): Promise<StorefrontV3Product | undefined> {
  try {
    const rows = await sql()`
      SELECT p.sku,p.slug,p.title_en,p.title_ar,p.title_zh,p.description_en,p.description_ar,p.description_zh,
        COALESCE((
          SELECT json_agg(json_build_object('url',image.blob_url) ORDER BY image.position)
          FROM retail_product_images image WHERE image.product_id=p.id
        ), '[]'::json) AS images,
        COALESCE((
          SELECT json_agg(json_build_object(
            'sku',v.sku,'title_en',v.title_en,'title_ar',v.title_ar,'title_zh',v.title_zh,
            'option_values',v.option_values,'amount_minor',price.amount_minor,
            'available',GREATEST(balance.on_hand-balance.reserved,0),
            'style_public_id',style.public_id,'style_code',style.code,
            'style_title_en',style.title_en,'style_title_ar',style.title_ar,'style_title_zh',style.title_zh,
            'style_option_values',style.option_values,'style_position',style.position,
            'style_image_url',style_image.blob_url
          ) ORDER BY style.position,v.sku)
          FROM retail_product_variants v
          JOIN retail_product_styles style ON style.id=v.style_id AND style.status='active'
          LEFT JOIN retail_product_images style_image ON style_image.id=style.primary_image_id
          JOIN retail_variant_inventory_balances balance ON balance.variant_id=v.id
          JOIN LATERAL (
            SELECT amount_minor FROM retail_variant_price_history
            WHERE variant_id=v.id AND active=true ORDER BY created_at DESC LIMIT 1
          ) price ON true
          WHERE v.product_id=p.id AND v.status='active'
        ), '[]'::json) AS variants
      FROM retail_products p
      WHERE p.status='published' AND p.slug=${slug}
        AND EXISTS (SELECT 1 FROM retail_product_images image WHERE image.product_id=p.id)
        AND EXISTS (
          SELECT 1 FROM retail_product_variants v
          JOIN retail_product_styles style ON style.id=v.style_id AND style.status='active'
          JOIN retail_variant_price_history price ON price.variant_id=v.id AND price.active=true
          WHERE v.product_id=p.id AND v.status='active'
        )
      LIMIT 1
    `;
    return rows[0] as StorefrontV3Product | undefined;
  } catch {
    return undefined;
  }
}

export async function quoteStorefrontV3(
  items: StorefrontV3CartItem[],
  checkout: unknown,
  promotionCode?: string,
): Promise<StorefrontV3Quote> {
  const rows = await sql()`SELECT * FROM retail_quote_checkout_v3(
    ${JSON.stringify(items)}::jsonb,
    ${JSON.stringify(checkout)}::jsonb,
    ${promotionCode ?? null}
  )`;
  const row = rows[0];
  if (!row) throw new Error("quote_unavailable");
  return {
    currency: String(row.currency).trim(), subtotalMinor: Number(row.subtotal_minor),
    shippingMinor: Number(row.shipping_minor), taxMinor: Number(row.tax_minor),
    discountMinor: Number(row.discount_minor), totalMinor: Number(row.total_minor),
    shippingMethod: "standard", items: row.items_snapshot, shipping: row.shipping_snapshot,
    quoteHash: String(row.quote_hash), promotionCode: row.promotion_code ? String(row.promotion_code) : null,
  };
}

export async function reserveStorefrontV3Order(
  requestId: string,
  items: StorefrontV3CartItem[],
  checkout: unknown,
  expectedTotalMinor: number,
  promotionCode?: string,
) {
  const query = sql();
  await query`SELECT * FROM retail_create_checkout_v3(
    ${requestId}::uuid,${JSON.stringify(items)}::jsonb,${JSON.stringify(checkout)}::jsonb,
    ${expectedTotalMinor},${promotionCode ?? null}
  )`;
  const rows = await query`SELECT o.paypal_order_id,o.client_request_id,o.currency,o.subtotal_minor,o.shipping_minor,
    o.tax_minor,o.discount_minor,o.amount_minor,o.shipping_method,o.checkout_email,o.checkout_shipping,o.status,
    o.capture_id,o.items_snapshot,
    COALESCE((SELECT json_agg(json_build_object(
      'variantSku',line.variant_sku,'quantity',line.quantity,'unitAmountMinor',line.unit_amount_minor
    ) ORDER BY line.variant_sku) FROM retail_order_lines line WHERE line.order_id=o.id), '[]'::json) AS checkout_items
    FROM retail_orders o WHERE o.client_request_id=${requestId}::uuid LIMIT 1`;
  const order = rows[0];
  if (!order) throw new Error("checkout_unavailable");
  return order;
}
