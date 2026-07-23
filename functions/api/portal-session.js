// FetchMux pilot portal: verifies a Stripe Checkout purchase server-side and
// issues a signed HttpOnly access cookie for the pilot duration. No customer
// data is stored anywhere; every request re-reads the source of truth (Stripe).

const COOKIE_NAME = "fm_portal";
const COOKIE_MAX_AGE_SECONDS = 60 * 24 * 60 * 60;

export async function onRequestPost(context) {
  let sessionId;
  try {
    const body = await context.request.json();
    sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    return json({ error: "That does not look like a checkout session." }, 400);
  }
  return respondForSession(context, sessionId, true);
}

export async function onRequestGet(context) {
  const cookie = readCookie(context.request.headers.get("Cookie") ?? "", COOKIE_NAME);
  if (!cookie) return json({ error: "No portal session." }, 401);

  const payload = await verifyToken(cookie, context.env.PORTAL_HMAC_SECRET);
  if (!payload) return json({ error: "Portal session expired." }, 401);

  return respondForSession(context, payload.sid, false);
}

async function respondForSession(context, sessionId, issueCookie) {
  const key = sessionId.startsWith("cs_test_")
    ? context.env.STRIPE_TEST_SECRET_KEY
    : context.env.STRIPE_SECRET_KEY;
  if (!key) return json({ error: "Portal verification is not configured." }, 500);

  const stripeResponse = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent.latest_charge`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  if (stripeResponse.status === 404) return json({ error: "Purchase not found." }, 404);
  if (!stripeResponse.ok) return json({ error: "Purchase lookup failed." }, 502);

  const session = await stripeResponse.json();
  if (session.payment_status !== "paid") {
    return json({ error: "This checkout was not completed." }, 402);
  }

  const workloadField = Array.isArray(session.custom_fields)
    ? session.custom_fields.find((field) => field.key === "workload")
    : undefined;

  const result = {
    email: session.customer_details?.email ?? "unknown",
    name: session.customer_details?.name ?? null,
    amountTotal: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    purchasedAt: session.created,
    workload: workloadField?.text?.value ?? null,
    receiptUrl: session.payment_intent?.latest_charge?.receipt_url ?? null,
    livemode: session.livemode === true,
  };

  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (issueCookie) {
    const token = await signToken(
      { sid: sessionId, exp: Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE_SECONDS },
      context.env.PORTAL_HMAC_SECRET,
    );
    if (!token) return json({ error: "Portal verification is not configured." }, 500);
    headers["Set-Cookie"] =
      `${COOKIE_NAME}=${token}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  }
  return new Response(JSON.stringify(result), { status: 200, headers });
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function readCookie(header, name) {
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return rest.join("=");
  }
  return null;
}

async function hmacKey(secret) {
  if (!secret) return null;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signToken(payload, secret) {
  const key = await hmacKey(secret);
  if (!key) return null;
  const body = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

async function verifyToken(token, secret) {
  const key = await hmacKey(secret);
  if (!key) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signature),
    new TextEncoder().encode(body),
  );
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body)));
    if (typeof payload.sid !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(text) {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
