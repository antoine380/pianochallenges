// Tests hors ligne des fonctions Edge « stripe » et « revenuecat » (aucun appel réseau : fetch est simulé).
// Usage : deno run --allow-env --allow-read --allow-net=127.0.0.1 tools/audit/fn_pay_test.ts
//   (deno via npm dans un dossier temporaire : npm i deno ; aucun secret réel, valeurs de test fixées ici)
// Vérifie : signature Stripe (bonne, mauvaise, trop vieille), webhook → sub_apply avec la bonne ligne (formule, statut,
// fin de période sur l'élément ou l'abonnement), checkout (prix, essai seulement pour solo_year, une fois, sans carte,
// client_reference_id, URL de retour), déjà abonné = 409, portail, RevenueCat (autorisation, essai, résiliation,
// remboursement, expiration, sandbox ignoré, achat anonyme ignoré).
const fails: string[] = [];
const check = (n: string, ok: boolean, d?: unknown) => { console.log((ok ? "OK   " : "FAIL ") + n + (!ok && d !== undefined ? " — " + JSON.stringify(d).slice(0, 400) : "")); if (!ok) fails.push(n); };
const E: Record<string, string> = { SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_SERVICE_ROLE_KEY: "service-test", STRIPE_SECRET_KEY: "sk_test_FAKE", STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_SOLO_MONTH: "price_month", STRIPE_PRICE_SOLO_YEAR: "price_year", STRIPE_PRICE_FAMILY_YEAR: "price_family", REVENUECAT_WEBHOOK_AUTH: "Bearer rc-test-secret" };
for (const [k, v] of Object.entries(E)) Deno.env.set(k, v);
// deno-lint-ignore no-explicit-any
type H = (r: Request) => Promise<Response>; const handlers: H[] = []; (Deno as any).serve = (h: H) => { handlers.push(h); return {}; };
// réseau simulé
const U1 = "11111111-1111-4111-8111-111111111111";
// deno-lint-ignore no-explicit-any
const calls: { url: string; method: string; body: string }[] = []; let SUBS: any[] = []; let CUS: string | null = null; let STRIPE_SUB: any = null;
// deno-lint-ignore no-explicit-any
(globalThis as any).fetch = async (input: string | Request, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.url, method = init?.method || (typeof input !== "string" ? input.method : "GET");
  const body = init?.body ? String(init.body) : "";
  calls.push({ url, method, body });
  const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });
  if (url.includes("/auth/v1/user")) return J({ id: U1, email: "maman@example.com", aud: "authenticated" });
  if (url.includes("/rest/v1/rpc/sub_apply")) return J({ ok: true, id: 1 });
  if (url.includes("/rest/v1/rpc/sub_customer")) return J(CUS);
  if (url.includes("/rest/v1/subscriptions")) return J(SUBS);
  if (url.startsWith("https://api.stripe.com/v1/subscriptions/")) return J(STRIPE_SUB);
  if (url === "https://api.stripe.com/v1/checkout/sessions") return J({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" });
  if (url === "https://api.stripe.com/v1/billing_portal/sessions") return J({ url: "https://billing.stripe.com/p/session/test_1" });
  return J({ error: "unexpected " + url }, 404);
};
const stripeMod = await import("../../supabase/functions/stripe/index.ts");
const rcMod = await import("../../supabase/functions/revenuecat/index.ts");
const [hStripe, hRc] = handlers;
const enc = new TextEncoder();
async function sign(raw: string, t = Math.floor(Date.now() / 1000), secret = E.STRIPE_WEBHOOK_SECRET) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const h = [...new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${t}.${raw}`)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${t},v1=${h}`;
}
const post = (h: H, path: string, body: unknown, headers: Record<string, string> = {}) => h(new Request("http://x/functions/v1/" + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));
const lastRpc = () => { const c = calls.filter((c) => c.url.includes("/rpc/sub_apply")).pop(); return c ? JSON.parse(c.body).p : null; };

// 1. signature
const raw = JSON.stringify({ type: "ping" });
check("signature Stripe valide", await stripeMod.verifyStripe(raw, await sign(raw), E.STRIPE_WEBHOOK_SECRET));
check("signature Stripe : mauvais secret refusé", !(await stripeMod.verifyStripe(raw, await sign(raw, undefined, "whsec_other"), E.STRIPE_WEBHOOK_SECRET)));
check("signature Stripe : plus de 5 min refusée", !(await stripeMod.verifyStripe(raw, await sign(raw, Math.floor(Date.now() / 1000) - 600), E.STRIPE_WEBHOOK_SECRET)));
check("signature Stripe : corps modifié refusé", !(await stripeMod.verifyStripe(raw + " ", await sign(raw), E.STRIPE_WEBHOOK_SECRET)));
let r = await post(hStripe, "stripe/webhook", raw, { "stripe-signature": "t=1,v1=00" });
check("webhook sans bonne signature : 400", r.status === 400);

// 2. webhook → sub_apply
const now = Math.floor(Date.now() / 1000);
STRIPE_SUB = { id: "sub_1", status: "trialing", customer: "cus_1", trial_end: now + 7 * 86400, cancel_at_period_end: false, metadata: { user_id: U1, product: "solo_year", plan: "solo" },
  items: { data: [{ current_period_end: now + 7 * 86400, price: { id: "price_year", unit_amount: 14900, currency: "eur", recurring: { interval: "year" } } }] } };
let ev = JSON.stringify({ type: "checkout.session.completed", data: { object: { mode: "subscription", subscription: "sub_1", client_reference_id: U1 } } });
r = await post(hStripe, "stripe/webhook", ev, { "stripe-signature": await sign(ev) });
let row = lastRpc();
check("checkout.session.completed → sub_apply solo_year en essai", r.status === 200 && row && row.user_id === U1 && row.product === "solo_year" && row.plan === "solo" && row.status === "trialing" && row.amount_cents === 14900 && row.billing === "year" && row.customer_id === "cus_1", row);
STRIPE_SUB = { ...STRIPE_SUB, id: "sub_2", status: "active", metadata: { user_id: U1 }, current_period_end: now + 365 * 86400, items: { data: [{ price: { id: "price_family", unit_amount: 19900, currency: "eur", recurring: { interval: "year" } } }] } };
ev = JSON.stringify({ type: "customer.subscription.updated", data: { object: { id: "sub_2" } } });
await post(hStripe, "stripe/webhook", ev, { "stripe-signature": await sign(ev) });
row = lastRpc();
check("customer.subscription.updated → family_year, fin de période lue sur l'abonnement (ancienne API)", row.plan === "family" && row.product === "family_year" && row.status === "active" && Date.parse(row.period_end) / 1000 === now + 365 * 86400, row);
STRIPE_SUB = { ...STRIPE_SUB, status: "canceled" };
ev = JSON.stringify({ type: "customer.subscription.deleted", data: { object: { id: "sub_2" } } });
await post(hStripe, "stripe/webhook", ev, { "stripe-signature": await sign(ev) });
check("customer.subscription.deleted → canceled", lastRpc().status === "canceled");
STRIPE_SUB = { ...STRIPE_SUB, status: "past_due" };
ev = JSON.stringify({ type: "invoice.payment_failed", data: { object: { parent: { subscription_details: { subscription: "sub_2" } } } } });
await post(hStripe, "stripe/webhook", ev, { "stripe-signature": await sign(ev) });
check("invoice.payment_failed (nouvelle forme) → past_due", lastRpc().status === "past_due");
const before = calls.length;
ev = JSON.stringify({ type: "charge.refunded", data: { object: {} } });
r = await post(hStripe, "stripe/webhook", ev, { "stripe-signature": await sign(ev) });
check("événement non suivi : 200, rien écrit", r.status === 200 && !calls.slice(before).some((c) => c.url.includes("sub_apply")));

// 3. checkout / portail
r = await post(hStripe, "stripe/checkout", { plan: "solo_year" });
check("checkout sans jeton : 401", r.status === 401);
const auth = { authorization: "Bearer user-jwt" };
r = await post(hStripe, "stripe/checkout", { plan: "life" }, auth);
check("checkout : formule inconnue (pas d'offre à vie) → 400", r.status === 400);
SUBS = []; CUS = null;
r = await post(hStripe, "stripe/checkout", { plan: "solo_year", lang: "fr" }, auth);
let j = await r.json(); let sent = decodeURIComponent(calls.filter((c) => c.url.endsWith("/checkout/sessions")).pop()!.body);
check("checkout solo_year : URL Stripe, prix, essai 7 j sans carte, client_reference_id, retours", r.status === 200 && /checkout\.stripe\.com/.test(j.url) && sent.includes("line_items[0][price]=price_year") && sent.includes("subscription_data[trial_period_days]=7")
  && sent.includes("payment_method_collection=if_required") && sent.includes("subscription_data[trial_settings][end_behavior][missing_payment_method]=cancel") && sent.includes("client_reference_id=" + U1)
  && sent.includes("success_url=https://pianochallenges.com/?go=premium&ok=1") && sent.includes("customer_email=maman@example.com") && sent.includes("subscription_data[metadata][user_id]=" + U1), sent);
SUBS = [{ store: "stripe", status: "canceled", period_end: new Date(Date.now() - 86400e3).toISOString() }]; CUS = "cus_1";
r = await post(hStripe, "stripe/checkout", { plan: "solo_year" }, auth);
sent = decodeURIComponent(calls.filter((c) => c.url.endsWith("/checkout/sessions")).pop()!.body);
check("checkout : pas de 2e essai pour un ancien abonné, client Stripe réutilisé", r.status === 200 && !sent.includes("trial_period_days") && sent.includes("customer=cus_1"), sent);
r = await post(hStripe, "stripe/checkout", { plan: "family_year" }, auth);
sent = decodeURIComponent(calls.filter((c) => c.url.endsWith("/checkout/sessions")).pop()!.body);
check("checkout family_year : prix Famille, sans essai", r.status === 200 && sent.includes("line_items[0][price]=price_family") && !sent.includes("trial_period_days"), sent);
SUBS = [{ store: "stripe", status: "active", period_end: new Date(Date.now() + 86400e3).toISOString() }];
r = await post(hStripe, "stripe/checkout", { plan: "solo_month" }, auth);
check("checkout : déjà abonné → 409 already_subscribed", r.status === 409 && (await r.json()).error === "already_subscribed");
r = await post(hStripe, "stripe/portal", {}, auth); j = await r.json();
check("portail client Stripe", r.status === 200 && /billing\.stripe\.com/.test(j.url) && decodeURIComponent(calls.filter((c) => c.url.endsWith("/billing_portal/sessions")).pop()!.body).includes("return_url=https://pianochallenges.com/?go=premium"));

// 4. RevenueCat
const rc = (event: unknown, a = E.REVENUECAT_WEBHOOK_AUTH) => post(hRc, "revenuecat", { api_version: "1.0", event }, { authorization: a });
const base = { app_user_id: U1, original_app_user_id: U1, aliases: [U1], product_id: "pc_solo_year", period_type: "TRIAL", expiration_at_ms: Date.now() + 7 * 864e5, original_transaction_id: "2000000111", price: 0, currency: "EUR", environment: "PRODUCTION", store: "APP_STORE" };
r = await rc({ ...base, type: "INITIAL_PURCHASE" }, "Bearer wrong");
check("RevenueCat : mauvaise autorisation → 401", r.status === 401);
r = await rc({ type: "TEST" });
check("RevenueCat : événement TEST → 200", r.status === 200);
r = await rc({ ...base, type: "INITIAL_PURCHASE" }); row = lastRpc();
check("RevenueCat INITIAL_PURCHASE (essai) → apple / solo / trialing", r.status === 200 && row.store === "apple" && row.plan === "solo" && row.status === "trialing" && row.store_id === "2000000111" && row.user_id === U1, row);
await rc({ ...base, type: "RENEWAL", product_id: "pc_family_year", period_type: "NORMAL", price: 199, expiration_at_ms: Date.now() + 365 * 864e5 }); row = lastRpc();
check("RevenueCat RENEWAL Famille → family / active / 199 €", row.plan === "family" && row.status === "active" && row.amount_cents === 19900 && row.billing === "year", row);
await rc({ ...base, type: "CANCELLATION", period_type: "NORMAL", cancel_reason: "UNSUBSCRIBE" }); row = lastRpc();
check("RevenueCat CANCELLATION → actif jusqu'à la fin, résiliation notée", row.status === "active" && row.cancel_at_period_end === true, row);
await rc({ ...base, type: "CANCELLATION", period_type: "NORMAL", cancel_reason: "CUSTOMER_SUPPORT" });
check("RevenueCat remboursement → refunded", lastRpc().status === "refunded");
await rc({ ...base, type: "EXPIRATION" });
check("RevenueCat EXPIRATION → expired", lastRpc().status === "expired");
await rc({ ...base, type: "INITIAL_PURCHASE", is_family_share: true, app_user_id: "22222222-2222-4222-8222-222222222222", original_app_user_id: "22222222-2222-4222-8222-222222222222", aliases: [] }); row = lastRpc();
check("RevenueCat Partage familial : une ligne par compte, sans montant", row.store_id === "2000000111:22222222-2222-4222-8222-222222222222" && row.amount_cents === null, row);
let n0 = calls.filter((c) => c.url.includes("sub_apply")).length;
await rc({ ...base, type: "INITIAL_PURCHASE", environment: "SANDBOX" });
await rc({ ...base, type: "INITIAL_PURCHASE", app_user_id: "$RCAnonymousID:abc", original_app_user_id: "$RCAnonymousID:abc", aliases: [] });
await rc({ ...base, type: "INITIAL_PURCHASE", product_id: "pc_lifetime" });
check("RevenueCat : sandbox, achat anonyme et produit inconnu ignorés", calls.filter((c) => c.url.includes("sub_apply")).length === n0);
Deno.env.set("REVENUECAT_SANDBOX", "1"); n0 = calls.filter((c) => c.url.includes("sub_apply")).length;
await rc({ ...base, type: "INITIAL_PURCHASE", environment: "SANDBOX" });
check("RevenueCat : REVENUECAT_SANDBOX=1 enregistre les achats de test", calls.filter((c) => c.url.includes("sub_apply")).length === n0 + 1);
check("revenuecat exporte la table des produits Apple (3 produits, pas d'offre à vie)", Object.keys(rcMod.APPLE).length === 3 && !Object.keys(rcMod.APPLE).some((k) => /life/.test(k)));

console.log(fails.length ? `\nfn_pay FAIL ${fails.length}` : "\nfn_pay OK");
Deno.exit(fails.length ? 1 : 0);
