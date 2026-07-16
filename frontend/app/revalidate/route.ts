import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

// universal-cms signiert Webhook-Payloads per HMAC-SHA256 (siehe WebhookSigner.cs dort),
// Format "sha256=<hex>" über den rohen Request-Body.
function isValidWebhookSignature(secret: string, rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(header);
  return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Zwei Wege, den Aufruf zu autorisieren: der universal-cms-Webhook (signierter Payload,
  // ausgelöst automatisch bei entry.published/updated/deleted) oder der einfache Shared-Secret-Header
  // (weiterhin genutzt fürs manuelle Nachtriggern und den Cache-Warmup direkt nach jedem Deploy).
  const signature = request.headers.get("x-universalcms-signature");
  const webhookSecret = process.env.UNIVERSALCMS_WEBHOOK_SECRET;
  const viaWebhook = !!webhookSecret && isValidWebhookSignature(webhookSecret, rawBody, signature);

  const legacySecret = request.headers.get("x-revalidate-secret");
  const viaSharedSecret = legacySecret === process.env.REVALIDATE_SECRET;

  if (!viaWebhook && !viaSharedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = JSON.parse(rawBody || "{}");
  // Webhook-Payloads liefern eine collectionId statt eines "tag" - da wir hier nicht wissen,
  // welche Collection zu welchem Tag gehört, revalidieren wir bei jedem Webhook-Event einfach alle.
  const tag: string = viaWebhook ? "all" : (body.tag ?? "all");

  if (tag === "all") {
    revalidateTag("services", "max");
    revalidateTag("pricing", "max");
    revalidateTag("testimonials", "max");
  } else {
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ revalidated: true, tag });
}
