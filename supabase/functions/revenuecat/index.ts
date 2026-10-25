// Piano Challenges — achats intégrés Apple via RevenueCat (Supabase Edge Function « revenuecat »). PRÊTE MAIS NON BRANCHÉE.
// RevenueCat appelle cette adresse à chaque événement d'abonnement (achat, renouvellement, résiliation, expiration…)
// avec l'en-tête Authorization réglé dans son tableau de bord (Integrations › Webhooks) : il doit être égal au secret
// REVENUECAT_WEBHOOK_AUTH. L'app configure RevenueCat avec l'id Supabase du joueur (appUserID), donc event.app_user_id
// = auth.users.id. La fonction écrit public.subscriptions (store « apple ») par public.sub_apply, comme la fonction stripe.
// Format des événements : https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
//
// Secrets (tapés par Antoine dans Supabase › Edge Functions › Secrets) :
//   REVENUECAT_WEBHOOK_AUTH  (une longue valeur au hasard, la même que dans RevenueCat, ex. « Bearer 7f3c… »)
//   facultatif : REVENUECAT_SANDBOX=1 pour enregistrer aussi les achats de test (compte Sandbox Apple), à retirer en production.
// Déploiement : supabase functions deploy revenuecat --no-verify-jwt   (RevenueCat n'a pas de jeton Supabase)
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// identifiants produits App Store (docs/PAIEMENT.md) → formule
export const APPLE: Record<string, { plan: "solo" | "family"; billing: "month" | "year" }> = {
  pc_solo_month: { plan: "solo", billing: "month" },
  pc_solo_year: { plan: "solo", billing: "year" },
  pc_family_year: { plan: "family", billing: "year" },
};
function same(a: string, b: string) { if (!a || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

// événement RevenueCat → ligne de public.subscriptions (null = rien à écrire)
// deno-lint-ignore no-explicit-any
export function rcRow(e: any) {
  const def = APPLE[String(e?.product_id || "").split(":")[0]];
  if (!def) return null;
  const ids = [e.app_user_id, e.original_app_user_id, ...(Array.isArray(e.aliases) ? e.aliases : [])].map(String);
  const user = ids.find((x) => UUID.test(x));
  if (!user) return null; // achat anonyme (avant la connexion) : RevenueCat renverra un TRANSFER / un nouvel événement après logIn
  const t = String(e.type || "");
  let status: string | null = e.period_type === "TRIAL" ? "trialing" : "active";
  let cancel = false;
  if (t === "CANCELLATION") { cancel = true; if (e.cancel_reason === "CUSTOMER_SUPPORT") status = "refunded"; } // remboursé par Apple
  else if (t === "BILLING_ISSUE") status = "past_due";
  else if (t === "EXPIRATION" || t === "SUBSCRIPTION_PAUSED") status = "expired";
  else if (!["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "SUBSCRIPTION_EXTENDED", "TEMPORARY_ENTITLEMENT_GRANT", "REFUND_REVERSED"].includes(t)) status = null;
  if (!status) return null;
  const orig = String(e.original_transaction_id || e.transaction_id || "");
  if (!orig) return null;
  const price = Number(e.price_in_purchased_currency ?? e.price);
  return {
    user_id: user, store: "apple",
    // Partage familial d'Apple (si Antoine l'active un jour) : même transaction pour plusieurs comptes → une ligne par compte
    store_id: e.is_family_share ? orig + ":" + user : orig,
    product: String(e.product_id).slice(0, 100), plan: e.is_family_share ? "solo" : def.plan, status, // un bénéficiaire du Partage familial Apple ne devient pas titulaire d'une famille Piano Challenges
    period_end: e.expiration_at_ms ? new Date(Number(e.expiration_at_ms)).toISOString() : null,
    trial_end: e.period_type === "TRIAL" && e.expiration_at_ms ? new Date(Number(e.expiration_at_ms)).toISOString() : null,
    cancel_at_period_end: cancel,
    amount_cents: Number.isFinite(price) && !e.is_family_share ? Math.round(price * 100) : null,
    currency: /^[A-Za-z]{3}$/.test(String(e.currency || "")) ? String(e.currency).toLowerCase() : null,
    billing: def.billing,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const want = env("REVENUECAT_WEBHOOK_AUTH");
  if (!want || !same(req.headers.get("authorization") || "", want)) return new Response("unauthorized", { status: 401 });
  // deno-lint-ignore no-explicit-any
  let body: any;
  try { body = await req.json(); } catch { return new Response("json", { status: 400 }); }
  const e = body?.event || {};
  if (e.type === "TEST") return ok({ ok: true, test: true });
  if (e.environment === "SANDBOX" && env("REVENUECAT_SANDBOX") !== "1") return ok({ ok: true, ignored: "sandbox" });
  if (e.type === "TRANSFER") return ok({ ok: true, ignored: "transfer" }); // l'achat suivra avec le bon compte
  const row = rcRow(e);
  if (!row) return ok({ ok: true, ignored: e.type || "unknown" });
  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const { data, error } = await db.rpc("sub_apply", { p: row });
  if (error) { console.error(error); return new Response("sub_apply", { status: 500 }); } // RevenueCat réessaiera
  return ok({ ok: true, out: data });
});
