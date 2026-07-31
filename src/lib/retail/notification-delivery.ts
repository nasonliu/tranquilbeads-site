import { deliverRetailNotifications } from "./notifications";

type DeliveryResult = Awaited<ReturnType<typeof deliverRetailNotifications>>;
type Delivery = () => Promise<DeliveryResult>;

export async function deliverRetailNotificationsWithDiagnostics(
  deliver: Delivery = deliverRetailNotifications,
) {
  try {
    const result = await deliver();
    if (!result.configured) {
      console.error("retail_notification_delivery_incomplete", "not_configured", 0);
    } else if (result.failed > 0) {
      console.error("retail_notification_delivery_incomplete", "delivery_failed", result.failed);
    }
    return result;
  } catch {
    // Never log recipient, provider payload, token, or exception text.
    console.error("retail_notification_delivery_incomplete", "worker_error", 0);
    return { processed: 0, sent: 0, failed: 0, configured: false };
  }
}
