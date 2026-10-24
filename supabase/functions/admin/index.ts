// Piano Challenges — actions sensibles du back office (Supabase Edge Function « admin »).
// Appelée par admin/index.html : sb.functions.invoke("admin", {body:{action, ...}}) avec le jeton de la session.
// Chaque appel revérifie le jeton : session en aal2 (mot de passe + code TOTP, champ « aal » du jeton), jeton validé par le
// serveur d'authentification (auth.getUser) ET compte présent dans public.admins avec le rôle demandé.
// Ensuite seulement, la clé service (variable d'environnement fournie par Supabase, jamais dans un fichier) sert à :
//   delete_user {id}                      owner   : supprime le compte (auth.users ; les tables suivent par « on delete cascade »)
//   suspend {id, on}                      support : suspend (ban) ou réactive un compte
//   notify {group | user_id, title, body, action}  owner pour un groupe, support pour un joueur : notification dans l'app
//   preview {}                            support : envoie les e-mails de bienvenue / série / récap à l'adresse de l'admin (job preview de « notify »)
// Toute action écrit une ligne dans public.admin_log (ajout seul).
// Déploiement : supabase functions deploy admin   (« Verify JWT » activé : seul un utilisateur connecté peut l'appeler)
// Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (fournis par Supabase), NOTIFY_SECRET (déjà créé pour « notify »).
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTIFY_SECRET = Deno.env.get("NOTIFY_SECRET") || "";
const ORIGINS = ["https://pianochallenges.com"];
const RANK: Record<string, number> = { owner: 3, support: 2, lecture: 1 };
const ACTION_RE = /^(daily|rank|learn|free|progress|hub|game:(runner|speed|memory))$/; // même règle que la table notifications
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0], "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
}
const json = (req: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
// lecture du contenu du jeton (sa signature et sa validité sont vérifiées juste après par auth.getUser)
function claims(jwt: string): Record<string, unknown> {
  try { const p = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(atob(p + "=".repeat((4 - p.length % 4) % 4))); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "method" });
  const auth = req.headers.get("authorization") || "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt || claims(jwt).aal !== "aal2") return json(req, 401, { error: "aal2 required" });
  // 1. qui appelle ? Le jeton est validé par le serveur d'authentification (getUser), puis le compte doit être dans admins.
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: who, error: whoErr } = await db.auth.getUser(jwt);
  if (whoErr || !who?.user) return json(req, 401, { error: "bad token" });
  const { data: adm } = await db.from("admins").select("role").eq("user_id", who.user.id).maybeSingle();
  if (!adm?.role) return json(req, 403, { error: "forbidden" });
  const me = { role: String(adm.role), email: who.user.email || "" };
  const myId = who.user.id;
  const need = (r: string) => (RANK[me.role] || 0) >= RANK[r];
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json(req, 400, { error: "json" }); }
  const log = (action: string, target: string | null, detail: Record<string, unknown>) =>
    db.from("admin_log").insert({ admin_id: myId, admin_email: me.email, action, target, detail });

  const action = String(body.action || "");
  try {
    if (action === "delete_user") {
      if (!need("owner")) return json(req, 403, { error: "owner only" });
      const id = String(body.id || ""); if (!UUID.test(id)) return json(req, 400, { error: "id" });
      if (id === myId) return json(req, 400, { error: "self" });
      const { data: adm } = await db.from("admins").select("role").eq("user_id", id).maybeSingle();
      if (adm) return json(req, 400, { error: "is admin" });
      const { data: prof } = await db.from("profiles").select("name").eq("id", id).maybeSingle();
      await log("user.delete", id, { name: prof?.name ?? null });
      const { error } = await db.auth.admin.deleteUser(id);
      if (error) return json(req, 500, { error: error.message });
      return json(req, 200, { ok: true });
    }
    if (action === "suspend") {
      if (!need("support")) return json(req, 403, { error: "support only" });
      const id = String(body.id || ""); if (!UUID.test(id) || id === myId) return json(req, 400, { error: "id" });
      const on = body.on !== false;
      const { error } = await db.auth.admin.updateUserById(id, { ban_duration: on ? "87600h" : "none" });
      if (error) return json(req, 500, { error: error.message });
      await log(on ? "user.suspend" : "user.unsuspend", id, {});
      return json(req, 200, { ok: true });
    }
    if (action === "notify") {
      const title = String(body.title || "").trim().slice(0, 120), text = String(body.body || "").trim().slice(0, 300);
      const act = body.action_link ? String(body.action_link) : null;
      if (title.length < 2) return json(req, 400, { error: "title" });
      if (act && !ACTION_RE.test(act)) return json(req, 400, { error: "action" });
      let ids: string[] = [];
      if (body.user_id) {
        if (!need("support")) return json(req, 403, { error: "support only" });
        const id = String(body.user_id); if (!UUID.test(id)) return json(req, 400, { error: "id" }); ids = [id];
      } else {
        if (!need("owner")) return json(req, 403, { error: "owner only" });
        const group = String(body.group || "");
        if (!["all", "active7", "inactive14", "fr", "en"].includes(group)) return json(req, 400, { error: "group" });
        const { data, error } = await db.rpc("admin_notify_targets", { p_group: group });
        if (error) return json(req, 500, { error: error.message });
        ids = (data || []).map((r: { user_id: string }) => r.user_id);
      }
      for (let i = 0; i < ids.length; i += 500) {
        const rows = ids.slice(i, i + 500).map(user_id => ({ user_id, kind: "news", cat: "news", title, body: text, action: act }));
        const { error } = await db.from("notifications").insert(rows);
        if (error) return json(req, 500, { error: error.message, sent: i });
      }
      await log("notify", body.user_id ? String(body.user_id) : String(body.group), { title, n: ids.length });
      return json(req, 200, { ok: true, sent: ids.length });
    }
    if (action === "preview") {
      if (!need("support")) return json(req, 403, { error: "support only" });
      if (!NOTIFY_SECRET) return json(req, 500, { error: "NOTIFY_SECRET missing" });
      const r = await fetch(URL_ + "/functions/v1/notify", { method: "POST",
        headers: { "Content-Type": "application/json", "x-notify-secret": NOTIFY_SECRET },
        body: JSON.stringify({ job: "preview", user_id: myId }) });
      await log("email.preview", myId, { status: r.status });
      return json(req, r.ok ? 200 : 502, { ok: r.ok, status: r.status });
    }
    return json(req, 400, { error: "unknown action" });
  } catch (e) {
    return json(req, 500, { error: String((e as Error)?.message || e) });
  }
});
