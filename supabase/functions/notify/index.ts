// Piano Challenges — e-mails and server notifications (Supabase Edge Function "notify", sent with Resend).
// Jobs (POST {job}, header x-notify-secret = NOTIFY_SECRET, called by pg_cron, see supabase/notifications.sql):
//   welcome : accounts created in the last 3 days that have not had the welcome e-mail
//   streak  : streak of 3 days or more, played yesterday but not yet today (sent around 19:00 Paris time)
//   weekly  : Sunday recap for the players active in the last 4 weeks
//   preview : {job:"preview", user_id} sends the three e-mails to one account, to check them
// Unsubscribe (GET or one-click POST): /functions/v1/notify?unsub=<token>&k=weekly|streak|social|news|all
// Secrets: RESEND_API_KEY, NOTIFY_SECRET (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase).
// Deploy with "Verify JWT" off: the function checks the shared secret itself, and the unsubscribe links have no token.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const db = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const SECRET = Deno.env.get("NOTIFY_SECRET") || "";
const FROM = Deno.env.get("NOTIFY_FROM") || "Piano Challenges <noreply@pianochallenges.com>";
const SITE = "https://pianochallenges.com/";
const FN = URL_ + "/functions/v1/notify";
const MAX_PER_RUN = 90; // Resend free plan: 100 e-mails a day

type Lang = "fr" | "en";
type Prefs = { user_id: string; email_weekly: boolean; email_streak: boolean; email_social: boolean; email_news: boolean; lang: Lang;
  unsub_token: string; welcome_sent_at: string | null; last_streak_mail: string | null; last_weekly_mail: string | null };

// ---------- dates (Europe/Paris, like the players) ----------
const parisDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d); // YYYY-MM-DD
const addDays = (day: string, n: number) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const levelInfo = (xp: number) => { let L = 1, base = 0, need = 100; while (xp >= base + need) { base += need; L++; need = 100 + (L - 1) * 40; } return { L, into: xp - base, need }; };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---------- data ----------
async function prefsFor(ids: string[]): Promise<Map<string, Prefs>> {
  const m = new Map<string, Prefs>(); if (!ids.length) return m;
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from("notif_prefs").select("*").in("user_id", ids.slice(i, i + 200));
    (data || []).forEach((p: Prefs) => m.set(p.user_id, p));
  }
  return m;
}
// a row is created with the defaults the first time (it carries the unsubscribe token)
async function ensurePrefs(id: string, lang: Lang): Promise<Prefs> {
  const { data } = await db.from("notif_prefs").select("*").eq("user_id", id).maybeSingle();
  if (data) return data as Prefs;
  const { data: ins } = await db.from("notif_prefs").insert({ user_id: id, lang }).select("*").single();
  return ins as Prefs;
}
async function emailOf(id: string): Promise<string | null> {
  const { data } = await db.auth.admin.getUserById(id);
  const u = data?.user; if (!u || !u.email || (!u.email_confirmed_at && !u.confirmed_at)) return null; return u.email;
}
async function langOf(id: string): Promise<Lang> {
  const { data } = await db.from("progress").select("data").eq("user_id", id).maybeSingle();
  return (data?.data?.settings?.lang === "en") ? "en" : "fr";
}
async function notifyRow(user_id: string, kind: string, cat: string, title: string, body: string, action: string | null) {
  await db.from("notifications").insert({ user_id, kind, cat, title: title.slice(0, 120), body: body.slice(0, 300), action });
}

// ---------- e-mail ----------
const T = {
  fr: { hi: (n: string) => `Salut ${n} !`, play: "Jouer maintenant", why: "Tu reçois cet e-mail parce que tu as un compte Piano Challenges.",
    unsubOne: "Ne plus recevoir ce type d'e-mail", unsubAll: "Ne plus recevoir aucun e-mail", settings: "Régler mes e-mails dans l'app (Réglages › Notifications)" },
  en: { hi: (n: string) => `Hi ${n}!`, play: "Play now", why: "You get this e-mail because you have a Piano Challenges account.",
    unsubOne: "Stop this kind of e-mail", unsubAll: "Stop all e-mails", settings: "Choose your e-mails in the app (Settings › Notifications)" },
};
function layout(lang: Lang, p: Prefs, kind: string, title: string, inner: string, cta = SITE) {
  const t = T[lang], u1 = `${FN}?unsub=${p.unsub_token}&k=${kind}`, u2 = `${FN}?unsub=${p.unsub_token}&k=all`;
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f1f2fb;font-family:Nunito,Segoe UI,Helvetica,Arial,sans-serif;color:#1b1838">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2fb"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 30px rgba(43,37,96,.12)">
<tr><td style="background:linear-gradient(135deg,#8b6cff,#5b3fd6);padding:22px 28px;color:#fff;font-family:Fredoka,Nunito,Arial,sans-serif;font-size:22px;font-weight:700">🎹 Piano Challenges</td></tr>
<tr><td style="padding:26px 28px 8px;font-size:16px;line-height:1.55">${inner}</td></tr>
<tr><td style="padding:10px 28px 28px"><a href="${cta}" style="display:inline-block;background:#6a4bf0;color:#fff;text-decoration:none;font-weight:800;padding:13px 26px;border-radius:999px">${t.play}</a></td></tr>
</table>
<p style="max-width:560px;font-size:12px;line-height:1.5;color:#6b6890;margin:16px auto 0">${t.why}<br><a href="${u1}" style="color:#6b6890">${t.unsubOne}</a> · <a href="${u2}" style="color:#6b6890">${t.unsubAll}</a><br>${t.settings}</p>
</td></tr></table></body></html>`;
  return { html, unsub: u1 };
}
let sentThisRun = 0;
async function send(to: string, subject: string, html: string, text: string, unsub: string) {
  if (!RESEND) throw new Error("RESEND_API_KEY missing");
  if (sentThisRun >= MAX_PER_RUN) return false;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": "Bearer " + RESEND, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text, headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }) });
  sentThisRun++; await sleep(550); // 2 requests per second at most
  if (!r.ok) { console.error("resend", r.status, await r.text()); return false; }
  return true;
}

// ---------- the e-mails ----------
function welcomeMail(lang: Lang, p: Prefs, name: string) {
  const fr = lang === "fr";
  const title = fr ? "Bienvenue sur Piano Challenges 🎹" : "Welcome to Piano Challenges 🎹";
  const inner = `<h1 style="font-family:Fredoka,Nunito,Arial,sans-serif;font-size:26px;margin:0 0 12px">${esc(T[lang].hi(name))}</h1>
<p>${fr ? "Ton compte est prêt : ta progression, ta série et ton ELO te suivent maintenant sur tous tes appareils." : "Your account is ready: your progress, streak and ELO now follow you on all your devices."}</p>
<p><b>${fr ? "Pour bien commencer :" : "To get started:"}</b></p>
<ul style="padding-left:20px;margin:0 0 8px">
<li>${fr ? "Branche ton clavier (USB ou Bluetooth) : il est reconnu tout seul, et un Do seul lance l'exercice." : "Plug in your keyboard (USB or Bluetooth): it is detected, and a lone C starts the exercise."}</li>
<li>${fr ? "Fais l'<b>entraînement du jour</b> : 10 exercices, environ 5 minutes." : "Do the <b>daily practice</b>: 10 exercises, about 5 minutes."}</li>
<li>${fr ? "Défie un bot ou un ami dans <b>GAMES</b> pour gagner tes premiers points d'ELO." : "Challenge a bot or a friend in <b>GAMES</b> to earn your first ELO points."}</li></ul>`;
  const text = `${T[lang].hi(name)}\n\n${fr ? "Ton compte Piano Challenges est prêt. Commence par l'entraînement du jour :" : "Your Piano Challenges account is ready. Start with the daily practice:"} ${SITE}`;
  return { subject: title, inner, text };
}
function streakMail(lang: Lang, name: string, days: number) {
  const fr = lang === "fr";
  const subject = fr ? `🔥 Ta série de ${days} jours t'attend` : `🔥 Your ${days}-day streak is waiting`;
  const inner = `<h1 style="font-family:Fredoka,Nunito,Arial,sans-serif;font-size:26px;margin:0 0 12px">🔥 ${days} ${fr ? "jours d'affilée" : "days in a row"}</h1>
<p>${esc(T[lang].hi(name))} ${fr ? "Tu n'as pas encore joué aujourd'hui. Un seul exercice avant minuit suffit pour garder ta série." : "You have not played today yet. One exercise before midnight keeps your streak alive."}</p>
<p>${fr ? "L'entraînement du jour prend environ 5 minutes." : "The daily practice takes about 5 minutes."}</p>`;
  const text = `${T[lang].hi(name)} ${fr ? `Ta série de ${days} jours t'attend : un exercice avant minuit suffit.` : `Your ${days}-day streak is waiting: one exercise before midnight is enough.`} ${SITE}`;
  return { subject, inner, text };
}
type Week = { xp: number; days: number; streak: number; level: number; toNext: number; rank: number | null; games: number; elo: { label: string; r: number; d: number } | null };
function weeklyMail(lang: Lang, name: string, w: Week) {
  const fr = lang === "fr";
  const subject = fr ? `Ta semaine au piano : ${w.xp} XP${w.rank ? `, ${w.rank}${w.rank === 1 ? "er" : "e"} au classement` : ""}` : `Your piano week: ${w.xp} XP${w.rank ? `, #${w.rank} on the leaderboard` : ""}`;
  const cell = (v: string, l: string) => `<td align="center" style="padding:12px 6px;background:#f1f2fb;border-radius:16px"><div style="font-family:Fredoka,Nunito,Arial,sans-serif;font-size:26px;font-weight:700;color:#5b3fd6">${v}</div><div style="font-size:12px;color:#6b6890;font-weight:700">${l}</div></td>`;
  const goal = w.days >= 5 ? (fr ? "Garde ce rythme : vise 7 jours sur 7 la semaine prochaine !" : "Keep it up: aim for 7 days out of 7 next week!")
    : (fr ? `Objectif de la semaine prochaine : jouer ${Math.min(7, w.days + 2)} jours.` : `Next week's goal: play on ${Math.min(7, w.days + 2)} days.`);
  const inner = `<h1 style="font-family:Fredoka,Nunito,Arial,sans-serif;font-size:26px;margin:0 0 12px">${fr ? "Ta semaine en un coup d'œil" : "Your week at a glance"}</h1>
<p>${esc(T[lang].hi(name))}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>${cell(String(w.xp), "XP")}${cell(String(w.days) + "/7", fr ? "jours joués" : "days played")}${cell("🔥 " + w.streak, fr ? "série" : "streak")}</tr></table>
<p>${fr ? `Niveau <b>${w.level}</b> : encore <b>${w.toNext} XP</b> pour le niveau ${w.level + 1}.` : `Level <b>${w.level}</b>: <b>${w.toNext} XP</b> to level ${w.level + 1}.`}
${w.rank ? (fr ? `<br>Tu es <b>${w.rank}${w.rank === 1 ? "er" : "e"}</b> au classement de la semaine.` : `<br>You are <b>#${w.rank}</b> on the weekly leaderboard.`) : ""}
${w.games ? (fr ? `<br>${w.games} duel${w.games > 1 ? "s" : ""} classé${w.games > 1 ? "s" : ""} cette semaine` : `<br>${w.games} rated duel${w.games > 1 ? "s" : ""} this week`) + (w.elo ? ` · ${esc(w.elo.label)} : <b>${w.elo.r}</b> (${w.elo.d >= 0 ? "+" : ""}${w.elo.d})` : "") + "." : ""}</p>
<p><b>${goal}</b></p>`;
  const text = `${T[lang].hi(name)} ${fr ? `Cette semaine : ${w.xp} XP, ${w.days}/7 jours, série de ${w.streak}.` : `This week: ${w.xp} XP, ${w.days}/7 days, ${w.streak}-day streak.`} ${goal} ${SITE}`;
  return { subject, inner, text };
}
const GAME = { fr: { runner: "Saute-notes", speed: "Contre la montre", memory: "Mémoire musicale" }, en: { runner: "Note Jumper", speed: "Time attack", memory: "Musical memory" } } as const;

// ---------- jobs ----------
async function jobWelcome() {
  const since = Date.now() - 3 * 86400000; let page = 1, sent = 0;
  while (page < 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 }); if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (!u.email || Date.parse(u.created_at) < since || (!u.email_confirmed_at && !u.confirmed_at)) continue;
      const lang = await langOf(u.id), p = await ensurePrefs(u.id, lang); if (p.welcome_sent_at) continue;
      const { data: prof } = await db.from("profiles").select("name").eq("id", u.id).maybeSingle();
      const m = welcomeMail(p.lang, p, prof?.name || (p.lang === "fr" ? "musicien" : "musician")), l = layout(p.lang, p, "news", m.subject, m.inner);
      if (await send(u.email, m.subject, l.html, m.text, l.unsub)) { sent++; await db.from("notif_prefs").update({ welcome_sent_at: new Date().toISOString() }).eq("user_id", u.id); }
    }
    if (data.users.length < 200) break; page++;
  }
  return { sent };
}
async function jobStreak() {
  const today = parisDay(), yest = addDays(today, -1);
  const { data: y } = await db.from("xp_log").select("user_id").eq("day", yest).gt("xp", 0);
  const { data: tdy } = await db.from("xp_log").select("user_id").eq("day", today).gt("xp", 0);
  const playedToday = new Set((tdy || []).map((r: { user_id: string }) => r.user_id));
  const ids = [...new Set((y || []).map((r: { user_id: string }) => r.user_id))].filter(id => !playedToday.has(id)); if (!ids.length) return { sent: 0 };
  const { data: profs } = await db.from("profiles").select("id,name,streak").in("id", ids).gte("streak", 3);
  const prefs = await prefsFor(ids); let sent = 0;
  for (const pr of profs || []) {
    let p = prefs.get(pr.id); if (p && (!p.email_streak || p.last_streak_mail === today || p.last_weekly_mail === today)) continue;
    const email = await emailOf(pr.id); if (!email) continue;
    if (!p) p = await ensurePrefs(pr.id, await langOf(pr.id));
    const m = streakMail(p.lang, pr.name, pr.streak), l = layout(p.lang, p, "streak", m.subject, m.inner);
    await notifyRow(pr.id, "streak", "remind", p.lang === "fr" ? `Ta série de ${pr.streak} jours est en danger` : `Your ${pr.streak}-day streak is in danger`, p.lang === "fr" ? "Joue un exercice avant minuit pour la garder." : "Play one exercise before midnight to keep it.", "daily");
    if (await send(email, m.subject, l.html, m.text, l.unsub)) { sent++; await db.from("notif_prefs").update({ last_streak_mail: today }).eq("user_id", pr.id); }
  }
  return { sent };
}
async function weekOf(id: string, since: string, rankMap: Map<string, number>, lang: Lang): Promise<Week> {
  const [{ data: logs }, { data: prof }, { data: prog }] = await Promise.all([
    db.from("xp_log").select("day,xp").eq("user_id", id).gte("day", since),
    db.from("profiles").select("xp,level,streak").eq("id", id).maybeSingle(),
    db.from("progress").select("data").eq("user_id", id).maybeSingle()]);
  const xp = (logs || []).reduce((a: number, r: { xp: number }) => a + (r.xp || 0), 0), days = new Set((logs || []).filter((r: { xp: number }) => r.xp > 0).map((r: { day: string }) => r.day)).size;
  const li = levelInfo(prof?.xp || 0);
  let games = 0, elo: Week["elo"] = null;
  const E = prog?.data?.elo || {};
  for (const [k, e] of Object.entries(E) as [string, { r: number; h?: { d: string; dd?: number }[] }][]) {
    const wk = (e.h || []).filter(h => h.d >= since); if (!wk.length) continue; games += wk.length;
    const d = wk.reduce((a, h) => a + (h.dd || 0), 0), [g, c] = k.split("-");
    if (!elo || Math.abs(d) > Math.abs(elo.d)) elo = { label: (GAME[lang] as Record<string, string>)[g] + (c === "notes" ? (lang === "fr" ? " · notes" : " · notes") : (lang === "fr" ? " · accords" : " · chords")), r: e.r, d };
  }
  return { xp, days, streak: prof?.streak || 0, level: li.L, toNext: li.need - li.into, rank: rankMap.get(id) || null, games, elo };
}
async function jobWeekly(only?: string) {
  const today = parisDay(), since = addDays(today, -6), active = addDays(today, -27);
  let ids: string[];
  if (only) ids = [only];
  else { const { data } = await db.from("xp_log").select("user_id").gte("day", active).gt("xp", 0); ids = [...new Set((data || []).map((r: { user_id: string }) => r.user_id))]; }
  const { data: lb } = await db.rpc("leaderboard", { since }); const rankMap = new Map<string, number>(); (lb || []).forEach((r: { id: string }, i: number) => rankMap.set(r.id, i + 1));
  const prefs = await prefsFor(ids); let sent = 0;
  for (const id of ids) {
    let p = prefs.get(id); if (!only && p && (!p.email_weekly || p.last_weekly_mail === today)) continue;
    const email = await emailOf(id); if (!email) continue;
    if (!p) p = await ensurePrefs(id, await langOf(id));
    const { data: prof } = await db.from("profiles").select("name").eq("id", id).maybeSingle();
    const w = await weekOf(id, since, rankMap, p.lang); if (!only && w.xp <= 0) continue;
    const m = weeklyMail(p.lang, prof?.name || "", w), l = layout(p.lang, p, "weekly", m.subject, m.inner);
    await notifyRow(id, "recap", "progress", p.lang === "fr" ? "Ton récap de la semaine" : "Your weekly recap", p.lang === "fr" ? `${w.xp} XP, ${w.days}/7 jours, série de ${w.streak}.` : `${w.xp} XP, ${w.days}/7 days, ${w.streak}-day streak.`, "progress");
    if (await send(email, m.subject, l.html, m.text, l.unsub)) { sent++; if (!only) await db.from("notif_prefs").update({ last_weekly_mail: today }).eq("user_id", id); }
  }
  return { sent };
}
async function jobPreview(id: string) {
  const email = await emailOf(id); if (!email) return { error: "no confirmed e-mail" };
  const p = await ensurePrefs(id, await langOf(id)); const { data: prof } = await db.from("profiles").select("name,streak").eq("id", id).maybeSingle();
  const w = welcomeMail(p.lang, p, prof?.name || ""), lw = layout(p.lang, p, "news", w.subject, w.inner); await send(email, "[test] " + w.subject, lw.html, w.text, lw.unsub);
  const s = streakMail(p.lang, prof?.name || "", Math.max(3, prof?.streak || 3)), ls = layout(p.lang, p, "streak", s.subject, s.inner); await send(email, "[test] " + s.subject, ls.html, s.text, ls.unsub);
  return { weekly: await jobWeekly(id) };
}

// ---------- unsubscribe ----------
const COLS: Record<string, string[]> = { weekly: ["email_weekly"], streak: ["email_streak"], social: ["email_social"], news: ["email_news"], all: ["email_weekly", "email_streak", "email_social", "email_news"] };
async function unsubscribe(token: string, k: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token) || !COLS[k]) return null;
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() }; COLS[k].forEach(c => upd[c] = false);
  const { data } = await db.from("notif_prefs").update(upd).eq("unsub_token", token).select("lang").maybeSingle();
  return data ? (data.lang === "en" ? "en" : "fr") as Lang : null;
}
function page(lang: Lang, ok: boolean) {
  const fr = lang === "fr";
  const msg = ok ? (fr ? "C'est noté : tu ne recevras plus ces e-mails. Tu peux les réactiver dans l'app, Réglages › Notifications." : "Done: you will not get these e-mails any more. You can turn them back on in the app, Settings › Notifications.")
    : (fr ? "Ce lien n'est plus valable." : "This link is no longer valid.");
  return new Response(`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Piano Challenges</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f1f2fb;font-family:Nunito,Segoe UI,Arial,sans-serif;color:#1b1838">
<div style="max-width:420px;margin:20px;background:#fff;border-radius:24px;padding:28px;box-shadow:0 12px 30px rgba(43,37,96,.12)"><h1 style="font-size:22px;margin:0 0 10px">🎹 Piano Challenges</h1><p>${msg}</p><p><a href="${SITE}" style="color:#6a4bf0;font-weight:800">${fr ? "Retour à l'app" : "Back to the app"}</a></p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url), token = url.searchParams.get("unsub");
  if (token) { const k = url.searchParams.get("k") || "all"; const lang = await unsubscribe(token, k); return page(lang || "fr", !!lang); }
  if (req.method !== "POST" || !SECRET || req.headers.get("x-notify-secret") !== SECRET) return new Response("forbidden", { status: 403 });
  let body: { job?: string; user_id?: string } = {}; try { body = await req.json(); } catch (_) { /* empty */ }
  try {
    const out = body.job === "welcome" ? await jobWelcome() : body.job === "streak" ? await jobStreak() : body.job === "weekly" ? await jobWeekly()
      : body.job === "preview" && body.user_id ? await jobPreview(body.user_id) : { error: "unknown job" };
    return Response.json(out);
  } catch (e) { console.error(e); return Response.json({ error: String(e) }, { status: 500 }); }
});
