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

final result: passed
