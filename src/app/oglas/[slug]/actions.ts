"use server";

import { COPY } from "@/config/copy";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { incrementViewCount } from "@/lib/data/listings";
import { inquirySchema, phoneIsUsable } from "@/lib/validation/inquiry";
import { fail, formString, succeed, toFieldErrors } from "@/lib/validation/helpers";
import { getClientIpHash, isRateLimited, looksAutomated } from "@/lib/rate-limit";
import { sendInquiryEmail } from "@/lib/email";
import type { ActionState } from "@/types/domain";

/**
 * Submit an inquiry from an anonymous visitor.
 *
 * `inquiries` has NO anon INSERT policy — deliberately. The insert here
 * runs on the service-role client, which is the only path into that
 * table, and it happens strictly after: bot heuristics, rate limiting,
 * zod validation, and a re-read of the listing to resolve the true
 * seller. The client never gets to say who the seller is.
 */
export async function submitInquiryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // 1. Bot heuristics. Answer as if it succeeded — telling a bot why it
  //    failed only helps it iterate.
  const honeypot = formString(formData, "website");
  const startedAt = Number(formData.get("startedAt"));
  if (looksAutomated(honeypot, startedAt)) {
    return succeed(COPY.contact.successBody);
  }

  // 2. Rate limit before doing any real work.
  const ipHash = await getClientIpHash();
  if (await isRateLimited(ipHash)) {
    return fail(COPY.validation.rateLimited);
  }

  // 3. Report a bad phone as a bad phone, rather than letting it become
  //    null and surface as "no contact channel given".
  const rawPhone = formString(formData, "senderPhone");
  if (!phoneIsUsable(rawPhone)) {
    return fail(COPY.validation.genericError, {
      senderPhone: COPY.validation.invalidPhone,
    });
  }

  const parsed = inquirySchema.safeParse({
    listingId: formString(formData, "listingId"),
    senderName: formString(formData, "senderName"),
    senderPhone: rawPhone,
    senderEmail: formString(formData, "senderEmail") ?? "",
    message: formString(formData, "message"),
  });

  if (!parsed.success) {
    return fail(COPY.validation.genericError, toFieldErrors(parsed.error));
  }

  const input = parsed.data;

  // 4. Resolve the seller from the listing itself, on the RLS-scoped
  //    client. A draft or missing listing returns nothing, so inquiries
  //    cannot be planted on unpublished rows.
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug, title, seller_id, status, contact_name, contact_email")
    .eq("id", input.listingId)
    .eq("status", "aktivan")
    .maybeSingle();

  if (!listing) {
    return fail(COPY.validation.genericError);
  }

  const row = listing as {
    id: string;
    slug: string;
    title: string;
    seller_id: string;
    contact_name: string;
    contact_email: string | null;
  };

  // 5. Insert on the service-role client.
  const admin = createAdminClient();
  const { error } = await admin.from("inquiries").insert({
    listing_id: row.id,
    seller_id: row.seller_id,
    sender_name: input.senderName,
    sender_phone: input.senderPhone,
    sender_email: input.senderEmail,
    message: input.message,
    ip_hash: ipHash,
  });

  if (error) {
    return fail(COPY.validation.genericError);
  }

  // 6. Notify by email if configured. Fire-and-forget: the visitor's
  //    confirmation must not wait on an SMTP round trip, and a mail
  //    failure must not look like a failed submission.
  const notifyTo = row.contact_email;
  if (notifyTo) {
    void sendInquiryEmail({
      to: notifyTo,
      sellerName: row.contact_name || COPY.contact.seller,
      listingTitle: row.title,
      listingSlug: row.slug,
      senderName: input.senderName,
      senderPhone: input.senderPhone,
      senderEmail: input.senderEmail,
      message: input.message,
    });
  }

  return succeed(COPY.contact.successBody);
}

/**
 * Records a page view. Called from a client effect rather than the page
 * body, because the detail page is ISR-cached — see incrementViewCount.
 *
 * Deliberately returns nothing and never throws: a failed counter must
 * be invisible to the visitor.
 */
export async function trackViewAction(listingId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return;
  await incrementViewCount(listingId);
}
