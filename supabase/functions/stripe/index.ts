// Piano Challenges — paiement sur le site avec Stripe (Supabase Edge Function « stripe »). PRÊTE MAIS NON BRANCHÉE :
// l'app ne l'appelle que si le paiement est ouvert (PAY_LIVE ou app_config.flags.payLive) ET qu'une clé publique Stripe
// est remplie (app_config.pay.stripe_pk). Procédure complète, pas à pas : docs/PAIEMENT.md.
//
//   POST /stripe/checkout  {plan: solo_month|solo_year|family_year, lang}   (jeton du joueur connecté)
//        → {url} d'une session Stripe Checkout (abonnement ; essai de TRIAL_DAYS jours pour solo_year, sans carte,
//          une seule fois par compte ; client_reference_id = id Supabase ; retour /?go=premium&ok=1 ou &cancel=1)
//   POST /stripe/portal    {}                                                (jeton du joueur connecté)
//        → {url} du portail client Stripe (changer de carte, de formule, résilier)
//   POST /stripe/webhook   (appelé par Stripe, signature « Stripe-Signature » vérifiée avec STRIPE_WEBHOOK_SECRET)
//        checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed
//        → public.sub_apply(...) met à jour public.subscriptions (et crée la famille pour family_year).
//
// Secrets (Supabase › Edge Functions › Secrets, tapés par Antoine, JAMAIS dans le dépôt) :
//   STRIPE_SECRET_KEY (sk_test_… puis sk_live_…), STRIPE_WEBHOOK_SECRET (whsec_…),
//   STRIPE_PRICE_SOLO_MONTH, STRIPE_PRICE_SOLO_YEAR, STRIPE_PRICE_FAMILY_YEAR (price_…),
//   facultatifs : SITE_URL (défaut https://pianochallenges.com), TRIAL_DAYS (défaut 7).
//   SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase.
// Déploiement : supabase functions deploy stripe --no-verify-jwt
//   (le webhook n'a pas de jeton Supabase : /checkout et /portal vérifient eux-mêmes le jeton du joueur avec auth.getUser).
// Aucun SDK Stripe : appels HTTPS directs à l'API (fetch), signature vérifiée avec Web Crypto.
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const SITE = env("SITE_URL", "https://pianochallenges.com").replace(/\/+$/, "");
const ORIGINS = [SITE, "https://pianochallenges.com"];
const TRIAL_DAYS = Math.max(0, Math.min(30, parseInt(env("TRIAL_DAYS", "7"), 10) || 7));
// produit → [nom du secret du prix, formule, essai ?]
const PRODUCTS: Record<string, { price: string; plan: "solo" | "family"; trial: boolean }> = {
  solo_month: { price: "STRIPE_PRICE_SOLO_MONTH", plan: "solo", trial: false },
  solo_year: { price: "STRIPE_PRICE_SOLO_YEAR", plan: "solo", trial: true },
  family_year: { price: "STRIPE_PRICE_FAMILY_YEAR", plan: "family", trial: false },
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
}
const json = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

// ---------- API Stripe (formulaire encodé, objets imbriqués « a[b][0][c] ») ----------
type Params = Record<string, unknown>;
function form(p: Params, pre = "", out: string[] = []): string[] {
  for (const [k, v] of Object.entries(p)) {
    if (v === undefined || v === null) continue;
    const key = pre ? `${pre}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => typeof x === "object" && x ? form(x as Params, `${key}[${i}]`, out) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(x))}`));
    else if (typeof v === "object") form(v as Params, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}
// deno-lint-ignore no-explicit-any
async function stripe(method: "GET" | "POST", path: string, p: Params = {}): Promise<any> {
  const key = env("STRIPE_SECRET_KEY");
  if (!/^(sk|rk)_(test|live)_/.test(key)) throw new Error("STRIPE_SECRET_KEY missing");
  const body = form(p).join("&");
  const url = "https://api.stripe.com/v1" + path + (method === "GET" && body ? "?" + body : "");
  const r = await fetch(url, { method, headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" }, body: method === "POST" ? body : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("stripe " + r.status + ": " + (j?.error?.message || "error"));
  return j;
}

// ---------- signature du webhook (https://docs.stripe.com/webhooks#verify-manually) ----------
const enc = new TextEncoder();
function hex(buf: ArrayBuffer) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
export async function verifyStripe(raw: string, header: string, secret: string, now = Date.now() / 1000, tolerance = 300): Promise<boolean> {
  if (!secret || !header) return false;
  const parts = header.split(",").map((x) => x.trim().split("="));
  const ts = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(ts) || !sigs.length || Math.abs(now - ts) > tolerance) return false;
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const want = hex(await crypto.subtle.sign("HMAC", k, enc.encode(`${ts}.${raw}`)));
  return sigs.some((s) => same(s, want));
}

// ---------- abonnement Stripe → ligne de public.subscriptions ----------
const STATUS: Record<string, string> = { trialing: "trialing", active: "active", past_due: "past_due", unpaid: "past_due", canceled: "canceled", incomplete_expired: "expired", paused: "expired" };
// deno-lint-ignore no-explicit-any
export function subRow(sub: any) {
  const item = sub?.items?.data?.[0] || {};
  const price = item.price || {};
  const product = Object.keys(PRODUCTS).find((k) => env(PRODUCTS[k].price) && env(PRODUCTS[k].price) === price.id) || String(sub?.metadata?.product || price.lookup_key || "");
  const def = PRODUCTS[product];
  const plan = def ? def.plan : (sub?.metadata?.plan === "family" ? "family" : "solo");
  const end = item.current_period_end ?? sub.current_period_end; // les versions récentes de l'API le mettent sur l'élément
  const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);
  return {
    user_id: UUID.test(String(sub?.metadata?.user_id || "")) ? sub.metadata.user_id : null,
    store: "stripe", store_id: String(sub.id), product: product || "unknown", plan,
    status: STATUS[sub.status] || null, period_end: iso(end), trial_end: iso(sub.trial_end),
    customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null,
    cancel_at_period_end: !!sub.cancel_at_period_end || !!sub.cancel_at,
    amount_cents: Number.isFinite(price.unit_amount) ? price.unit_amount : null, currency: price.currency || null,
    billing: price.recurring?.interval === "month" ? "month" : price.recurring?.interval === "year" ? "year" : null,
  };
}
async function applySub(subId: string, userHint: string | null) {
  const sub = await stripe("GET", "/subscriptions/" + encodeURIComponent(subId));
  const row = subRow(sub);
  if (!row.status) return { skipped: sub.status }; // « incomplete » : le paiement n'est pas fini, on attend la suite
  if (!row.user_id && userHint && UUID.test(userHint)) row.user_id = userHint;
  const { data, error } = await db().rpc("sub_apply", { p: row });
  if (error) throw new Error("sub_apply: " + error.message);
  return data;
}

// ---------- le joueur qui appelle /checkout ou /portal ----------
async function caller(req: Request) {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await db().auth.getUser(jwt);
  return error || !data?.user ? null : data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method" });
  const path = new URL(req.url).pathname.replace(/\/+$/, "").split("/").pop();
  try {
    if (path === "webhook") {
      const raw = await req.text();
      if (!(await verifyStripe(raw, req.headers.get("stripe-signature") || "", env("STRIPE_WEBHOOK_SECRET")))) return json(req, 400, { error: "signature" });
      const ev = JSON.parse(raw), o = ev?.data?.object || {};
      let out: unknown = { ignored: ev?.type };
      if (ev.type === "checkout.session.completed" && o.mode === "subscription" && o.subscription) out = await applySub(String(o.subscription), o.client_reference_id || null);
      else if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type)) out = await applySub(String(o.id), null);
      else if (ev.type === "invoice.paid" || ev.type === "invoice.payment_failed") {
        const sid = o.subscription || o.parent?.subscription_details?.subscription; // ancienne et nouvelle forme de l'API
        if (sid) out = await applySub(String(typeof sid === "string" ? sid : sid.id), null);
      }
      return json(req, 200, { ok: true, out });
    }

    const user = await caller(req);
    if (!user) return json(req, 401, { error: "not_signed_in" });
    const sb = db();
    if (path === "checkout") {
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { /* corps vide */ }
      const product = String(body.plan || ""), def = PRODUCTS[product];
      if (!def) return json(req, 400, { error: "plan" });
      const price = env(def.price);
      if (!/^price_/.test(price)) return json(req, 500, { error: "price missing: " + def.price });
      // déjà abonné sur Stripe : on l'envoie au portail plutôt que de payer deux fois
      const { data: subs } = await sb.from("subscriptions").select("store,status,period_end").eq("user_id", user.id);
      const live = (subs || []).some((s) => ["trialing", "active", "past_due"].includes(s.status) && (!s.period_end || Date.parse(s.period_end) > Date.now()));
      if (live) return json(req, 409, { error: "already_subscribed" });
      const { data: cus } = await sb.rpc("sub_customer", { p_user: user.id });
      const lang = body.lang === "en" ? "en" : "fr";
      const p: Params = {
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        client_reference_id: user.id,
        success_url: SITE + "/?go=premium&ok=1",
        cancel_url: SITE + "/?go=premium&cancel=1",
        locale: lang,
        allow_promotion_codes: "true",
        metadata: { user_id: user.id, product },
        subscription_data: { metadata: { user_id: user.id, product, plan: def.plan } },
      };
      if (cus) p.customer = cus; else if (user.email) p.customer_email = user.email;
      // essai : annuel Solo seulement, une seule fois par compte (aucun abonnement passé), sans carte demandée
      if (def.trial && TRIAL_DAYS > 0 && !(subs || []).length) {
        (p.subscription_data as Params).trial_period_days = TRIAL_DAYS;
        (p.subscription_data as Params).trial_settings = { end_behavior: { missing_payment_method: "cancel" } };
        p.payment_method_collection = "if_required";
      }
      const s = await stripe("POST", "/checkout/sessions", p);
      return json(req, 200, { url: s.url });
    }
    if (path === "portal") {
      const { data: cus } = await sb.rpc("sub_customer", { p_user: user.id });
      if (!cus) return json(req, 404, { error: "no_customer" });
      const s = await stripe("POST", "/billing_portal/sessions", { customer: cus, return_url: SITE + "/?go=premium" });
      return json(req, 200, { url: s.url });
    }
    return json(req, 404, { error: "path" });
  } catch (e) {
    console.error(e);
    return json(req, 500, { error: String((e as Error).message || e).slice(0, 200) });
  }
});
