# WhatsApp Conversion Tracking Design

Date: 2026-07-15

## Goal

Record every primary-click or keyboard activation from the TranquilBeads website to WhatsApp as the existing primary Google Ads `CONTACT` conversion, with a bounded and failure-safe navigation delay for same-tab links.

The conversion is a click-to-WhatsApp lead proxy. It confirms that a visitor opened the WhatsApp contact flow; it does not prove that the visitor sent a message.

## Existing State

- Google Ads conversion action `whatsapp` is enabled, primary for goal, included in the Conversions metric, and uses one conversion per ad click.
- The account-level `CONTACT / WEBSITE` conversion goal is biddable.
- The required destination is `AW-18288748181/20lzCNadhckcEJXN4JBE`.
- The website loads the Google tag directly and tracks Amazon and Noon outbound clicks.
- The GTM workspace lists exactly three tags: a Google tag, conversion linker, and WhatsApp conversion tag. Google Tag Manager currently reports all three tags as paused by Google's malware scanning system. There are no listed analytics, consent, remarketing, or other production tags in this container, so removing its loader does not remove an active integration.
- No active website code currently sends the WhatsApp conversion event, so Google Ads has received zero WhatsApp conversions.
- WhatsApp links appear in several server-rendered pages and shared navigation components.

## Selected Approach

Keep the direct Google tag as the single Google Ads sender, remove the inactive GTM container loader from the root layout, and replace the existing retail-only inline listener with one client-side click tracker. The tracker owns delegated Amazon, Noon, and WhatsApp click handling.

The tracker exposes independently testable units:

- `classifyOutboundDestination(url)` recognizes supported retail and WhatsApp destinations.
- `buildConversionCommand(destination)` returns the Google Ads destination and conversion payload.
- `handleTrackedOutboundClick(event, dependencies)` coordinates diagnostics, tag dispatch, and navigation through injected dependencies.

The classifier returns `amazon`, `noon`, `whatsapp`, or `null`. The command builder maps those tracked destinations to their existing labels:

- `amazon` -> `AW-18288748181/XzgJCIKpiMkcEJXN4JBE`, value 1 USD
- `noon` -> `AW-18288748181/U4LbCIWpiMkcEJXN4JBE`, value 1 USD
- `whatsapp` -> `AW-18288748181/20lzCNadhckcEJXN4JBE`, with no invented monetary value

The click handler dependency contract provides:

- `gtag`, optional, for conversion dispatch
- `pushDataLayer`, for diagnostic events
- `navigate`, for same-tab navigation
- `setTimeout` and `clearTimeout`, for deterministic timeout control
- `currentPath`, supplied without query strings or fragments

The event-facing input provides the closest anchor URL, target, modifier keys, and default-prevented state. DOM anchor discovery remains a thin adapter around this testable handler.

Supported destinations:

- `wa.me`
- `api.whatsapp.com`
- `web.whatsapp.com`
- `whatsapp.com` and dot-delimited subdomains such as `api.whatsapp.com` and `web.whatsapp.com`
- the `whatsapp:` application scheme

Hostname matching must use exact hostnames or dot-delimited subdomains. A hostname such as `fakewhatsapp.com` must not match.

This approach covers current links and future WhatsApp links without requiring every React component to remember an `onClick` handler.

## Event Flow

1. A visitor activates an anchor with a primary click or keyboard action that produces a click event, including clicks on nested elements. Middle-click and context-menu navigation are outside this listener's stated coverage.
2. The listener resolves the closest anchor URL and classifies the destination.
3. For WhatsApp, the listener pushes a `whatsapp_contact_click` diagnostic event to `dataLayer` with only the current page path and destination host or protocol. It must not include query strings or fragments because WhatsApp URLs can contain prefilled message text.
4. The listener sends `gtag('event', 'conversion', { send_to: 'AW-18288748181/20lzCNadhckcEJXN4JBE' })`.
5. `_blank`, named-target, modified, or already prevented clicks continue without interception after the conversion command is queued.
6. Ordinary same-tab clicks use Google's event callback with a 1,000 ms event timeout and a 1,200 ms fallback. A one-shot navigation guard clears the fallback and prevents the callback and timeout from navigating twice. The maximum intentional delay is 1,200 ms.

No phone number, message text, email, or other customer data is included in the diagnostic event.

## Duplicate Protection

The listener handles the click once in the document bubble phase, after target and React click handlers have had a chance to cancel the event. It does not add per-component WhatsApp handlers. The root layout no longer loads GTM, ensuring the direct Google tag is the only conversion sender. Modified clicks and links configured to open a new or named tab are recorded without preventing their default behavior.

## Failure Handling

- If the URL is malformed, the listener ignores it.
- If `gtag` is unavailable, the listener does not prevent default navigation and the WhatsApp link still works.
- If Google's callback does not run, a timeout completes same-tab navigation.
- Untracked links retain their current behavior. Amazon and Noon retain their existing conversion labels, values, diagnostics, and navigation behavior under the shared tracker.

## Verification

- Unit tests cover exact and subdomain WhatsApp recognition, application-scheme recognition, lookalike-host rejection, nested targets, conversion payload, redacted diagnostic payload, modified/default-prevented clicks, same-tab and new-tab behavior, unavailable `gtag`, and one-shot callback/timeout navigation.
- Existing inquiry conversion and retail outbound conversion tests remain passing.
- A browser smoke test on the built site uses a new-tab WhatsApp CTA or a controlled navigation dependency to confirm that activation adds the expected conversion command to `dataLayer` and preserves the destination URL.
- After production deployment, Tag Assistant must show the direct Google tag and WhatsApp conversion firing on a controlled click. Google Ads conversion diagnostics must then recognize the tag; an attributed ad conversion is a separate signal that requires an eligible ad interaction and can be delayed.

## Bidding Rollout

Automated-bidding rollout is an operational follow-up, not part of this code change. Keep the website inquiry form conversion primary as a second lead signal. Consider a campaign-level Maximize Conversions experiment only after Tag Assistant and Google Ads diagnostics both confirm the repaired WhatsApp signal.
