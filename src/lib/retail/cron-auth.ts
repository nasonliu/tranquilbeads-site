import { timingSafeEqual } from "node:crypto";

/** Pure, fail-closed authorization check for Vercel's scheduled invocation. */
export function isAuthorizedRetailReservationCron(authorization: string | null, secret = process.env.CRON_SECRET): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
