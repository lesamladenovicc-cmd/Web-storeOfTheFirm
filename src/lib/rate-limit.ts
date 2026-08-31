import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { LIMITS } from "@/config/site";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * RATE LIMITING — Postgres-backed, no Redis.
 *
 * Counts recent inquiries carrying the same IP hash. At MVP volume the
 * indexed count is trivial, and it avoids adding a second datastore for
 * one counter.
 *
 * PRIVACY: only a salted SHA-256 of the address is ever stored. Without
 * INQUIRY_IP_SALT the hash would be a plain rainbow-table lookup of the
 * IPv4 space, so a missing salt disables the limiter rather than
 * pretending to protect anything.
 */

export async function getClientIpHash(): Promise<string | null> {
  const { inquiryIpSalt } = serverEnv();
  if (!inquiryIpSalt) return null;

  const h = await headers();
  // x-forwarded-for is a client-settable header; it is only trustworthy
  // because Vercel overwrites it at the edge. The leftmost entry is the
  // original client.
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  if (!ip) return null;

  return createHash("sha256").update(`${inquiryIpSalt}:${ip}`).digest("hex");
}

/**
 * True when this client has already sent the maximum inquiries in the
 * trailing hour. Fails OPEN: a limiter outage must not take the contact
 * form down, since the form is the entire point of the site.
 */
export async function isRateLimited(ipHash: string | null): Promise<boolean> {
  if (!ipHash) return false;

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 3_600_000).toISOString();

    const { count, error } = await admin
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if (error) return false;
    return (count ?? 0) >= LIMITS.inquiriesPerHourPerIp;
  } catch {
    return false;
  }
}

/**
 * Bot heuristics that cost a real user nothing:
 *  - a honeypot field that is hidden from humans and irresistible to bots
 *  - a minimum fill time; scripted posts are effectively instantaneous
 */
export function looksAutomated(honeypot: string | undefined, startedAt: number | undefined): boolean {
  if (honeypot && honeypot.trim() !== "") return true;
  if (startedAt !== undefined && Number.isFinite(startedAt)) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= 0 && elapsed < LIMITS.inquiryMinFillMs) return true;
  }
  return false;
}
