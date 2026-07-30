import "server-only";

import { z } from "zod";

import type { RetailAgentActor } from "./agent-auth";
import { createCatalogStyle, createCatalogVariant, listCatalogStyles, listCatalogVariants, styleCreateDto, styleUpdateDto, updateCatalogStyle, updateCatalogVariant, variantCreateDto, variantUpdateDto } from "./catalog-admin";
import { reorderRetailProductImages } from "./media-service";
import { createAdminProduct, listAdminProducts, mediaReorderDto, productDto, productPdpContentDto, productUpdateDto, updateAdminProduct, updateAdminProductPdpContent } from "./operations";

const productId = z.string().uuid();
const productUpdateAction = productUpdateDto.extend({ action: z.literal("product.update"), productId });
const productContentAction = productPdpContentDto.extend({ action: z.literal("product.content.replace"), productId });
const styleUpdateAction = styleUpdateDto.extend({ action: z.literal("style.update"), styleId: z.string().uuid() });
const variantUpdateAction = variantUpdateDto.extend({ action: z.literal("variant.update"), variantId: z.string().uuid() });

export const agentCatalogActionDto = z.discriminatedUnion("action", [
  productDto.extend({ action: z.literal("product.create"), status: z.literal("draft") }),
  productUpdateAction,
  productContentAction,
  styleCreateDto.extend({ action: z.literal("style.create") }),
  styleUpdateAction,
  variantCreateDto.extend({ action: z.literal("variant.create") }),
  variantUpdateAction,
  mediaReorderDto.extend({ action: z.literal("media.reorder") }),
]);

export async function getAgentCatalogSnapshot() {
  const [products, styles, variants] = await Promise.all([listAdminProducts(), listCatalogStyles(), listCatalogVariants()]);
  return { products, styles, variants };
}

export async function executeAgentCatalogAction(input: z.infer<typeof agentCatalogActionDto>, actor: RetailAgentActor) {
  switch (input.action) {
    case "product.create": {
      const { action: _action, ...data } = input;
      void _action;
      return { entity: "product", result: await createAdminProduct(data, actor), created: true };
    }
    case "product.update": {
      const { action: _action, productId: id, ...data } = input;
      void _action;
      return { entity: "product", result: await updateAdminProduct(id, data, actor) };
    }
    case "product.content.replace": {
      const { action: _action, productId: id, ...data } = input;
      void _action;
      return { entity: "product_content", result: await updateAdminProductPdpContent(id, data, actor) };
    }
    case "style.create": {
      const { action: _action, ...data } = input;
      void _action;
      return { entity: "style", result: await createCatalogStyle(data, actor), created: true };
    }
    case "style.update": {
      const { action: _action, styleId, ...data } = input;
      void _action;
      return { entity: "style", result: await updateCatalogStyle(styleId, data, actor) };
    }
    case "variant.create": {
      const { action: _action, ...data } = input;
      void _action;
      return { entity: "variant", result: await createCatalogVariant(data, actor), created: true };
    }
    case "variant.update": {
      const { action: _action, variantId, ...data } = input;
      void _action;
      return { entity: "variant", result: await updateCatalogVariant(variantId, data, actor) };
    }
    case "media.reorder": {
      const { action: _action, ...data } = input;
      void _action;
      return { entity: "media", result: await reorderRetailProductImages(data, actor) };
    }
  }
}
