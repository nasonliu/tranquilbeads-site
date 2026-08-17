# WhatsApp Conversion Tracking Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every primary-click or keyboard activation of a TranquilBeads WhatsApp link send the existing Google Ads WhatsApp conversion through the direct Google tag, while preserving retail conversions and bounded navigation behavior.

**Architecture:** Remove the paused GTM container loader and the retail-only inline listener from the root layout. Add a pure tracking module for destination classification, payload construction, and click coordination, plus a small client component that adapts DOM clicks to the pure module.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, Google Ads `gtag.js`.

---

## Chunk 1: Tracking Core

### Task 1: Define and verify the tracking contract

**Files:**
- Create: `src/lib/google-ads-click-tracking.ts`
- Create: `tests/google-ads-click-tracking.test.ts`

- [ ] **Step 1: Write failing classifier and mapping tests**

Add table-driven tests for `classifyOutboundDestination` covering Amazon, Noon, exact WhatsApp hosts, dot-delimited WhatsApp subdomains, `whatsapp:` application URLs, malformed/untracked URLs, and lookalikes such as `fakewhatsapp.com`. Assert exact `buildConversionCommand` output for all destinations: the three labels, Amazon/Noon value `1` and currency `USD`, and no `value` or `currency` properties for WhatsApp.

- [ ] **Step 2: Run the classifier tests and verify RED**

Run: `npm run test:run -- tests/google-ads-click-tracking.test.ts`

Expected: exit status 1 and `tests/google-ads-click-tracking.test.ts` fails because `src/lib/google-ads-click-tracking.ts` and its exports do not exist.

- [ ] **Step 3: Implement the minimal classifier and conversion mapping**

Define:

```ts
export type TrackedDestination = "amazon" | "noon" | "whatsapp";

export function classifyOutboundDestination(
  href: string,
  baseUrl: string,
): TrackedDestination | null;

export function buildConversionCommand(destination: TrackedDestination): {
  send_to: string;
  value?: number;
  currency?: "USD";
};
```

Use exact or dot-delimited hostname checks. Map destinations to the three existing labels and omit monetary value for WhatsApp.

- [ ] **Step 4: Run the classifier tests and verify GREEN**

Run: `npm run test:run -- tests/google-ads-click-tracking.test.ts`

Expected: exit status 0 and `tests/google-ads-click-tracking.test.ts` passes.

- [ ] **Step 5: Write failing click-coordination tests**

Test `handleTrackedOutboundClick` with injected `gtag`, diagnostic push, navigation, timers, and current path. Cover:

- WhatsApp diagnostic redaction: page path plus host/protocol only, never query or fragment.
- Retail diagnostic preservation with exact keys `event: retail_outbound_click`, `retail_platform`, and full `retail_url`, plus exact retail labels, value `1`, and currency `USD`.
- New/named target, modifier, and default-prevented clicks queue conversion without interception.
- Same-tab clicks set `event_timeout: 1000`, schedule the fallback at exactly 1,200 ms, clear the fallback when the callback succeeds, and navigate once if callback and fallback are both invoked.
- Missing or throwing `gtag` never intercepts navigation.
- Throwing diagnostic dispatch never blocks conversion or navigation.
- Untracked input emits no diagnostic, sends no conversion, does not navigate, and returns no interception.

- [ ] **Step 6: Run the click tests and verify RED**

Run: `npm run test:run -- tests/google-ads-click-tracking.test.ts`

Expected: exit status 1 and the new click-coordination assertions fail because the behavior is not implemented.

- [ ] **Step 7: Implement the minimal click coordinator**

Define explicit input and dependency types. Return whether the DOM adapter should prevent default behavior. Catch diagnostic and third-party dispatch errors. Use a one-shot navigation guard that clears the fallback timer.

- [ ] **Step 8: Run the tracking tests and verify GREEN**

Run: `npm run test:run -- tests/google-ads-click-tracking.test.ts`

Expected: exit status 0 and `tests/google-ads-click-tracking.test.ts` passes.

- [ ] **Step 9: Commit the tracking core**

```bash
git add src/lib/google-ads-click-tracking.ts tests/google-ads-click-tracking.test.ts
git commit -m "feat: add direct Google Ads click tracking core"
```

## Chunk 2: Browser Integration And Deployment

### Task 2: Install the shared client tracker

**Files:**
- Create: `src/components/google-ads-click-tracker.tsx`
- Create: `tests/google-ads-click-tracker.test.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write a failing client-component test**

Render `GoogleAdsClickTracker` with a nested element inside a `wa.me` anchor. Dispatch a primary click on the nested element and a keyboard-generated click with `detail: 0`; assert that the adapter supplies the resolved URL, target, modifiers, default-prevented state, `window.gtag`, diagnostic push, `window.location.pathname`, timers, and navigation dependencies exactly once per event. Assert `preventDefault()` only when the core returns `true`, gracefully ignore a non-`Element` event target, and prove unmount removes the delegated listener.

- [ ] **Step 2: Run the component test and verify RED**

Run: `npm run test:run -- tests/google-ads-click-tracker.test.tsx`

Expected: exit status 1 and `tests/google-ads-click-tracker.test.tsx` fails because the component does not exist.

- [ ] **Step 3: Implement the minimal client adapter**

Create a client component that installs one bubble-phase document click listener in `useEffect`, ignores non-`Element` targets, resolves `event.target.closest('a[href]')`, and calls the pure handler with anchor/event properties plus adapters for `window.gtag`, diagnostics, `window.location.pathname`, `window.location.assign`, `window.setTimeout`, and `window.clearTimeout`. Running after target handlers lets the adapter observe a normal React or native `preventDefault()` before it decides whether to intercept navigation. The diagnostic adapter must initialize `window.dataLayer = window.dataLayer || []` inside the adapter before calling `push`, so an early click cannot dereference an absent array. Call `event.preventDefault()` only when instructed and remove the listener during cleanup.

- [ ] **Step 4: Run the component test and verify GREEN**

Run: `npm run test:run -- tests/google-ads-click-tracker.test.tsx`

Expected: exit status 0 and `tests/google-ads-click-tracker.test.tsx` passes.

- [ ] **Step 5: Replace the paused GTM and inline listener in the root layout**

Remove the `GoogleTagManager` import, `gtmId` constant, GTM component, and `outboundRetailConversionScript`. Keep the external `gtag.js` loader. Add a dedicated inline `Script` with id `google-ads-init` and `beforeInteractive` strategy before the loader in `app/layout.tsx`, so the queue exists before the external Google script starts. It preserves:

```js
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-18288748181');
```

Render `GoogleAdsClickTracker` once inside `body` after page content.

- [ ] **Step 6: Run focused regressions**

Run:

```bash
npm run test:run -- tests/google-ads-click-tracking.test.ts tests/google-ads-click-tracker.test.tsx tests/inquiry-form.test.tsx tests/google-ads-api.test.ts
```

Expected: exit status 0 and all four focused test files pass with no unexpected warnings.

- [ ] **Step 7: Run project verification**

Run:

```bash
npm run test:run
npm run lint
npm run build
```

Expected: each command exits 0; Vitest reports zero failed tests, ESLint reports zero errors, and Next.js completes a production build.

- [ ] **Step 8: Run a local browser smoke test**

Run this in a separate terminal session:

```bash
npm run start -- --port 3100
```

Expected startup evidence: Next.js reports the server ready at `http://localhost:3100`.

Open `http://localhost:3100/en/contact` with the in-app browser. Before activation, inspect script `src` values and confirm no `googletagmanager.com/gtm.js` URL exists while `googletagmanager.com/gtag/js?id=AW-18288748181` does. Activate the existing `https://wa.me/447840890109` new-tab CTA, then inspect `window.dataLayer` and confirm it contains an array-like `Arguments` entry where:

```js
entry[0] === "event"
entry[1] === "conversion"
entry[2].send_to === "AW-18288748181/20lzCNadhckcEJXN4JBE"
```

and a `whatsapp_contact_click` diagnostic containing only `/en/contact` and `wa.me`, with no query or fragment fields. Stop the server session after the smoke test.

- [ ] **Step 9: Commit the browser integration**

```bash
git add app/layout.tsx src/components/google-ads-click-tracker.tsx tests/google-ads-click-tracker.test.tsx
git commit -m "fix: restore WhatsApp conversion tracking"
```

- [ ] **Step 10: Deploy and verify production**

Run:

```bash
git push origin codex/google-ads-ops-handoff
SHA=$(git rev-parse HEAD)
for attempt in $(seq 1 20); do
  DEPLOYMENT_ID=$(gh api 'repos/nasonliu/tranquilbeads-site/deployments?per_page=20' --jq 'map(select(.sha == "'"$SHA"'"))[0].id // empty')
  [ -n "$DEPLOYMENT_ID" ] && break
  sleep 15
done
[ -n "$DEPLOYMENT_ID" ] || { echo "Deployment was not created within 5 minutes"; exit 1; }
for attempt in $(seq 1 40); do
  STATUS=$(gh api "repos/nasonliu/tranquilbeads-site/deployments/$DEPLOYMENT_ID/statuses" --jq '.[0].state // "pending"')
  [ "$STATUS" = "success" ] && break
  [ "$STATUS" = "error" ] || [ "$STATUS" = "failure" ] || [ "$STATUS" = "inactive" ] && exit 1
  sleep 15
done
[ "$STATUS" = "success" ] || { echo "Deployment did not succeed within 10 minutes"; exit 1; }
gh api "repos/nasonliu/tranquilbeads-site/deployments/$DEPLOYMENT_ID/statuses" --jq '.[0] | {state, environment_url, created_at, description}'
```

Expected: push exits 0 and the bounded polling finishes with `state: success` and an `environment_url`. Open that URL and repeat the script/dataLayer checks from Step 8. Connect Tag Assistant to the deployment and require it to show both the direct Google tag `AW-18288748181` and the WhatsApp conversion destination `AW-18288748181/20lzCNadhckcEJXN4JBE` firing on the controlled activation. Immediate acceptance is: no GTM loader, the direct Google tag is present, the command is queued, Tag Assistant observes transmission, and the inquiry conversion test remains green.

- [ ] **Step 11: Recheck Google Ads diagnostics before automated bidding**

After Google has processed the controlled event, reopen Google Ads Goals and inspect the `whatsapp` conversion action. Record the diagnostic state and timestamp. Automated bidding remains blocked until both conditions hold:

1. Tag Assistant observed `AW-18288748181/20lzCNadhckcEJXN4JBE` firing on production.
2. Google Ads diagnostics no longer report the WhatsApp tag as inactive or misconfigured.

Diagnostic recognition still does not prove an attributed conversion; an attributed conversion requires an eligible ad interaction. If diagnostics have not refreshed after 48 hours, repeat the controlled event and inspect tag/network errors before changing bidding.
