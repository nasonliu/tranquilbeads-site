# WhatsApp Conversion Tracking Design

Date: 2026-07-15

## Goal

Record every intentional click from the TranquilBeads website to WhatsApp as the existing primary Google Ads `CONTACT` conversion, without blocking or delaying the customer's WhatsApp experience.

The conversion is a click-to-WhatsApp lead proxy. It confirms that a visitor opened the WhatsApp contact flow; it does not prove that the visitor sent a message.

## Existing State

- Google Ads conversion action `whatsapp` is enabled, primary for goal, included in the Conversions metric, and uses one conversion per ad click.
- The account-level `CONTACT / WEBSITE` conversion goal is biddable.
- The required destination is `AW-18288748181/20lzCNadhckcEJXN4JBE`.
- The website loads the Google tag and tracks Amazon and Noon outbound clicks.
- No website code currently sends the WhatsApp conversion event, so Google Ads has received zero WhatsApp conversions.
- WhatsApp links appear in several server-rendered pages and shared navigation components.

## Selected Approach

Add one delegated click listener at the root of the website. It detects links whose destination is a supported WhatsApp host and sends the Google Ads conversion event.

Supported destinations:

- `wa.me`
- `api.whatsapp.com`
- `web.whatsapp.com`
- `whatsapp.com` and its subdomains

This approach covers current links and future WhatsApp links without requiring every React component to remember an `onClick` handler.

## Event Flow

1. A visitor clicks an anchor element.
2. The listener resolves the anchor URL and checks whether it is a WhatsApp destination.
3. The listener pushes a `whatsapp_contact_click` diagnostic event to `dataLayer` with only the current page path and destination host.
4. The listener sends `gtag('event', 'conversion', { send_to: 'AW-18288748181/20lzCNadhckcEJXN4JBE' })`.
5. Links that open in another tab continue immediately. Same-tab links use Google's event callback with a short timeout fallback so navigation still occurs if the tag is blocked or slow.

No phone number, message text, email, or other customer data is included in the diagnostic event.

## Duplicate Protection

The listener handles the click once in the capture phase. It does not add per-component WhatsApp handlers, avoiding duplicate `gtag` calls. Modified clicks and links already configured to open a new tab are recorded without preventing their default behavior.

## Failure Handling

- If the URL is malformed, the listener ignores it.
- If `gtag` is unavailable, the WhatsApp link still works.
- If Google's callback does not run, a timeout completes same-tab navigation.
- Non-WhatsApp links retain their current behavior.

## Verification

- Unit tests cover WhatsApp host recognition, non-WhatsApp rejection, conversion payload, diagnostic payload, and navigation behavior.
- Existing inquiry conversion and retail outbound conversion tests remain passing.
- A browser smoke test on the built site confirms that clicking a WhatsApp CTA adds the expected conversion command to `dataLayer` and preserves the destination URL.
- After production deployment, Google Ads diagnostics should change after Google processes a real or controlled click. Ads reporting can take time to attribute the conversion.

## Bidding Rollout

Do not treat the code deployment alone as evidence that automated bidding is ready. First verify that Google Ads is receiving the WhatsApp conversion and that the signal represents useful contacts. Then move campaigns from manual CPC to Maximize Conversions as a controlled campaign-level experiment. Keep the website inquiry form conversion primary as a second lead signal.

