# Retail admin design QA

## Scope

- Screen: authenticated Chinese retail order detail for sandbox order `#6`
- Reference: `/Users/liuyu/.codex/generated_images/019f9de8-757f-7e21-9549-7798e9b6eaec/exec-822a846d-b26c-46c3-b4c2-18aed651e11c.png`
- Implementation: `https://tranquilbeads-site-6mwhzb4y6-tranquilbeads.vercel.app/admin/retail/orders/6`
- Storefront: `https://tranquilbeads-site-6mwhzb4y6-tranquilbeads.vercel.app/en/shop`

## Viewports and state

- Reference comparison: 1488 x 1056 desktop viewport, order detail at the top of the page.
- Desktop verification: 1488 x 1056 and 1280 x 900, Chinese locale, fully refunded PayPal Sandbox order.
- Mobile verification: 375 x 812 emulation with a full-page capture, Chinese locale, the same order and data.
- Fresh final tabs reported no application console errors.

## Comparison history

1. The first implementation comparison matched the cream palette, sidebar, cards, hierarchy, and two-column order layout, but the summary card was too tall and pushed Payment, Fulfillment, and Activity below the reference position.
2. The order summary, payment, fulfillment, activity, and sidebar vertical spacing was tightened without changing data or interaction structure. The redundant visible catalogue-image caption was retained for screen readers only.
3. The final side-by-side comparison placed Order summary, Payment, and Fulfillment in the same desktop viewport while preserving the implementation's additional refund, fee, address, and audit information.

## Interaction and content checks

- Language selector renders and persists Chinese admin copy.
- Product image, long SKU, Arabic title, totals, PayPal fee, full refund, and negative net values remain legible.
- The 1280px layout keeps the table and right rail readable without overlap.
- The 375px layout stacks the cards and action forms, wraps the SKU and amounts, and preserves all controls without clipping.
- Sandbox payment capture, full refund, refund ledger posting, finance reconciliation, reservation release, and storefront inventory readback were verified before the final visual pass.

## Severity assessment

- P0: none.
- P1: none.
- P2: none after the desktop and mobile density pass.

## Retail product detail and content editor

### Scope and visual truth

- Screen: Chinese sandbox product detail plus the authenticated Chinese `Content & A+` editor.
- Before/reference screenshot: `/tmp/projectnoor-pdp-before-20260729.png` (1497 x 1296).
- Storefront implementation screenshot: `/tmp/projectnoor-pdp-after-20260730.png` (1497 x 2197 full page) and `/tmp/projectnoor-pdp-after-top-20260730.png` (1497 x 801 viewport).
- Admin implementation screenshot: `/tmp/projectnoor-admin-content-after-20260730.png` (1497 x 2705 full page).
- Mobile implementation screenshot: `/tmp/projectnoor-pdp-mobile-20260730-v2.png` (375 x 812 capture from a temporary 390 x 844 viewport override).
- Combined comparison: `/tmp/projectnoor-pdp-comparison-viewport-20260730.png`.
- Verified Preview: `https://tranquilbeads-retail-preview.vercel.app/zh/shop/mvp-sandbox-tasbih-20260727`.

### Comparison history

1. The previous PDP exposed only one large image, title, price, SKU, stock, and an add-to-cart button, followed immediately by the footer.
2. The implementation preserves the existing cream, serif, rounded-panel TranquilBeads language while adding a gallery rail contract, five highlights, quantity control, trust links, specification table, and an image-capable A+ story module.
3. The final desktop comparison shows the stronger purchase hierarchy and added merchandising depth without replacing the existing site header, footer, colors, or typography.

### Interaction and state checks

- Chinese storefront rendered all five saved highlights, three detail rows, and the saved A+ module from the database.
- Quantity increased from 1 to 2 and the product entered the cart; the button changed to `已加入购物车`.
- The mobile breakpoint retained the gallery, SKU authority, quantity control, product content, trust links, and A+ content; the temporary viewport override was reset afterwards.
- The standalone admin route separated content from product information, SKC, SKU, price/inventory, media, and preview pages.
- The Chinese admin editor loaded saved English, Arabic, and Chinese values and confirmed `Saved.` after the write.
- No current application console errors were reported in the storefront or admin tab. Two stale Chrome-extension message-channel entries belonged to the superseded Preview URL and were not application errors.

### Severity assessment

- P0: none.
- P1: none.
- P2: none after desktop, mobile, persistence, and interaction verification.

final result: passed
