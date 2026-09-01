import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Inquiry } from "@/types/domain";

/**
 * DATA / INQUIRIES — dashboard reads only.
 *
 * Uses the cookie client so RLS scopes every read to the signed-in
 * seller (or everything, for an admin). Anonymous inserts happen
 * elsewhere, on the service-role client — see the inquiry action.
 */

type InquiryRow = {
  id: string;
  listing_id: string;
  seller_id: string;
  sender_name: string;
  sender_phone: string | null;
  sender_email: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  listings: { title: string; slug: string } | null;
};

function toInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listings?.title ?? null,
    listingSlug: row.listings?.slug ?? null,
    sellerId: row.seller_id,
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    senderEmail: row.sender_email,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function getInquiries(): Promise<Inquiry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select(
      "id, listing_id, seller_id, sender_name, sender_phone, sender_email, " +
        "message, is_read, created_at, listings ( title, slug )",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];
  return (data as unknown as InquiryRow[]).map(toInquiry);
}

/**
 * Unread badge count. Returns 0 rather than throwing: this runs in the
 * dashboard layout, and a counter must never take the dashboard down.
 */
export async function getUnreadInquiryCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
