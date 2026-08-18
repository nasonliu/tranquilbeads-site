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

---

# Retail homepage management QA

## Operator workflow

- Added one top-level `Page management / 页面管理` destination in the existing retail-admin shell.
- Homepage editing is grouped into hero, three shopping cards, and an ordered five-product selection instead of exposing database IDs or a global media form.
- Image replacement uploads directly inside the section it changes; the returned Blob URL is assigned to the current homepage draft.
- Draft saving and publishing are separate. Publish stays disabled while local edits are unsaved, and the customer homepage reads only the published payload.
- English and Arabic storefront content remain the only public homepage languages; Chinese is used only for the private admin interface.

## Safety and verification

- Homepage links accept internal paths only; image references accept bundled paths or credential-free HTTPS URLs.
- Draft and publish writes use optimistic versions, UUID idempotency keys, attributed audit records, same-origin checks, permission checks, and post-write readback.
- The public homepage falls back to the existing hardcoded presentation if the page table or stored payload is unavailable.
- Targeted homepage/admin tests: 18 passed.
- Full retail suite: 79 files and 366 tests passed.
- Retail and admin TypeScript checks: passed.
- Local and Vercel production builds: passed; the Preview migration applied successfully.
- The protected Preview route opened at the expected retail-admin login screen; authenticated visual review remains available after the operator signs in.

final result: passed for code, migration, build, and protected-route verification

---

# TranquilBeads retail-first storefront design QA

Reference: Gulf Gifting Maison option 3.

## Fidelity review

- Layout: passed. The dark-plum gift hero, cream navigation, three editorial shopping cards, bestseller rail, trust modules, newsletter, and footer preserve the selected hierarchy.
- Typography: passed. Display serif and compact sans-serif hierarchy match the selected direction without clipping at desktop or mobile sizes.
- Color: passed. Plum, cream, emerald, and muted gold are consistently mapped across hero, calls to action, newsletter, and footer.
- Imagery: passed. The implementation uses existing TranquilBeads product photography and gift-box imagery; no placeholder or synthetic product claims were introduced.
- Content: passed. The homepage is retail-first, Amazon and Noon are separate buying channels, and wholesale appears only as a quiet standalone footer path.

## Responsive and interaction review

- Desktop 1536 x 1024: passed; no horizontal overflow, overlapping controls, or cropped copy.
- Mobile 390 x 844: passed; navigation remains horizontally scrollable, calls to action stack, and product imagery preserves its crop.
- Arabic RTL 1536 x 1024: passed; document direction, content order, buttons, and cards render RTL with zero horizontal overflow.
- Core routes: passed; Shop, material, bead-count, gifting, Amazon, Noon, account, cart, policy, newsletter, and wholesale links remain functional.

## Customer-facing information review

- Removed wholesale and distributor calls to action from the Amazon and Noon retail pages.
- Removed internal exchange-rate source labels and timestamps from the customer currency control.
- Removed exact sellable stock quantities from product cards.
- Removed the unverified universal `$99+` claim; free shipping is described only for eligible orders.
- Kept internal operations, source-system names, 1688 metrics, and MOQ copy out of the retail-first homepage and direct-shop surfaces.

## Verification

- Targeted UI, SEO, launch, and navigation tests: 28 passed.
- Retail and admin TypeScript checks: passed.
- Next.js production build: passed, 157 pages generated.
- Browser console: no application errors during final desktop, mobile, and RTL passes.

final result: passed
