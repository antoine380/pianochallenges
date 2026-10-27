// Piano Challenges — e-mails and server notifications (Supabase Edge Function "notify", sent with Resend).
// Jobs (POST {job}, header x-notify-secret = NOTIFY_SECRET, called by pg_cron, see supabase/notifications.sql):
//   welcome : accounts created in the last 3 days that have not had the welcome e-mail
//   streak  : streak of 3 days or more, played yesterday but not yet today (sent around 19:00 Paris time)
//   weekly  : Sunday recap for the players active in the last 4 weeks
//   path    : every hour (cron pc-path at :05) — the next First steps lesson (screen D24, lot 4): accounts that started the First steps and
//             have not played today, at their reminder hour (notif_prefs.remind_hour, time zone notif_prefs.tz), 3 reminders without return
//             at most, then one « your spot is kept » 14 days after the last session. Who is due comes from SQL: path_due() / path_mark()
//             (supabase/migrations/2026-10-25_reminder.sql). Uses the « Rappels » switch (email_streak) and the same unsubscribe link.
//   preview : {job:"preview", user_id} sends the four e-mails to one account, to check them
// E-mail design: see « e-mail » below (benchmark of 25/10/2026); render them locally with tools/mails/render.ts (no network, no sending)
// Unsubscribe: the link (GET) only redirects to the site, which asks for a confirmation and then POSTs here (mail link scanners do not unsubscribe anyone);
// mail clients' one-click unsubscribe (RFC 8058) POSTs directly: /functions/v1/notify?unsub=<token>&k=weekly|streak|social|news|all
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
const MAX_PER_RUN = 90; // per job run (the Resend free plan allows 100 e-mails a day in all)

type Lang = "fr" | "en";
type Prefs = { user_id: string; email_weekly: boolean; email_streak: boolean; email_social: boolean; email_news: boolean; lang: Lang;
  unsub_token: string; welcome_sent_at: string | null; last_streak_mail: string | null; last_weekly_mail: string | null; last_path_mail?: string | null };

// ---------- dates (Europe/Paris, like the players) ----------
const parisDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d); // YYYY-MM-DD
const addDays = (day: string, n: number) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const levelInfo = (xp: number) => { let L = 1, base = 0, need = 100; while (xp >= base + need) { base += need; L++; need = 100 + (L - 1) * 40; } return { L, into: xp - base, need }; };
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---------- data ----------
// every row of a query (PostgREST returns 1000 rows at most per request)
async function allRows<T>(q: () => any): Promise<T[]> {
  const out: T[] = []; for (let from = 0; from < 100000; from += 1000) { const { data, error } = await q().range(from, from + 999); if (error || !data) break; out.push(...data); if (data.length < 1000) break; }
  return out;
}
async function profilesOf(ids: string[], cols: string) {
  const out: any[] = []; for (let i = 0; i < ids.length; i += 200) { const { data } = await db.from("profiles").select(cols).in("id", ids.slice(i, i + 200)); out.push(...(data || [])); }
  return out;
}
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
// Design (benchmark of 25/10/2026, Figma « Benchmark e-mails »): one main button that opens the right screen of the app (?go=, read by the app at start),
// a hidden preheader, a visual block in the app's colours built with tables only (keyboard Do red → Si violet, 7-day calendar, progress bar),
// no external image, a light and a dark version (prefers-color-scheme), a full plain-text version. Never guilt: one exercise is enough, freezes exist.
const T = {
  fr: { hi: (n: string) => `Salut ${n} !`, play: "Jouer maintenant", why: "Tu reçois cet e-mail parce que tu as un compte Piano Challenges.",
    unsubOne: "Ne plus recevoir ce type d'e-mail", unsubAll: "Ne plus recevoir aucun e-mail", settings: "Régler mes e-mails dans l'app (Réglages › Notifications)",
    days: ["L", "M", "M", "J", "V", "S", "D"], textSet: "Régler ou arrêter ces e-mails : Réglages › Notifications dans l'app." },
  en: { hi: (n: string) => `Hi ${n}!`, play: "Play now", why: "You get this e-mail because you have a Piano Challenges account.",
    unsubOne: "Stop this kind of e-mail", unsubAll: "Stop all e-mails", settings: "Choose your e-mails in the app (Settings › Notifications)",
    days: ["M", "T", "W", "T", "F", "S", "S"], textSet: "Change or stop these e-mails: Settings › Notifications in the app." },
};
// the links of the buttons: the app opens the matching screen (daily practice, First steps lesson, Progress), see « Liens des e-mails » in the app
const GO = (go: "daily" | "pp" | "progress" | "hub", from: string) => `${SITE}?go=${go}&from=${from}`;
const C = { night: "#15122e", lav: "#f1f2fb", ink: "#1b1838", mut: "#6b6890", vio: "#6a4bf0", soft: "#f1f2fb", line: "#e2dff3", fire: "#ff9a3c" };
// the colours of the notes, as on the app's keyboard (--note-0 … --note-11, Do red → Si violet)
const NC = ["#ff5a6e", "#ff7a55", "#ff9a3c", "#ffb63d", "#ffd23f", "#3ddc84", "#3dd2ba", "#3cc8f0", "#4ba2f8", "#5b7cff", "#8873ff", "#b26bff"];
const FONT_T = "Fredoka,'Trebuchet MS',Nunito,Arial,sans-serif", FONT = "Nunito,'Segoe UI',Helvetica,Arial,sans-serif";
type Extra = { pre?: string; after?: string };
const h1 = (s: string) => `<h1 class="pc-tx pc-h1" style="font-family:${FONT_T};font-size:28px;line-height:1.2;font-weight:700;margin:0 0 12px;color:${C.ink}">${s}</h1>`;
const kick = (s: string, col: string = C.vio) => `<div style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${col};margin:0 0 6px">${s}</div>`;
const para = (s: string, extra = "") => `<p class="pc-tx" style="margin:0 0 14px;color:${C.ink};${extra}">${s}</p>`;
const muted = (s: string) => `<p class="pc-mut" style="margin:0 0 14px;font-size:14px;line-height:1.5;color:${C.mut}">${s}</p>`;
// a soft box (tip, goal)
const box = (s: string, ico = "") => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px"><tr><td class="pc-soft pc-tx" style="background:${C.soft};border-radius:16px;padding:14px 16px;font-size:15px;line-height:1.5;color:${C.ink}">${ico ? `<span style="font-size:18px">${ico}</span>&nbsp; ` : ""}${s}</td></tr></table>`;
// bulletproof button (a table cell with a background: works in Outlook too)
const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr><td align="center" bgcolor="${C.vio}" style="border-radius:999px;background:${C.vio}">
<a href="${href}" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:17px;font-weight:800;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`;
// progress bar (0..1)
const bar = (v: number, col: string = C.vio) => { const pc = Math.max(3, Math.min(100, Math.round(v * 100)));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 6px"><tr><td class="pc-soft" style="background:${C.line};border-radius:999px;font-size:0;line-height:0;height:12px">
<table role="presentation" width="${pc}%" cellpadding="0" cellspacing="0"><tr><td style="background:${col};border-radius:999px;height:12px;font-size:0;line-height:0">&nbsp;</td></tr></table></td></tr></table>`; };
// big numbers in a row
const stats = (cells: [string, string][]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin:4px 0 10px"><tr>${cells.map(([v, l]) =>
  `<td align="center" class="pc-soft" style="padding:12px 4px;background:${C.soft};border-radius:16px" width="${Math.floor(100 / cells.length)}%"><div style="font-family:${FONT_T};font-size:26px;font-weight:700;color:${C.vio}">${v}</div><div class="pc-mut" style="font-size:12px;color:${C.mut};font-weight:700">${l}</div></td>`).join("")}</tr></table>`;
// one octave of the app's keyboard, the notes of the lesson lit in their colour (tables only: no image to block)
function keys(lang: Lang, lit: number[], caption = "") {
  const on = new Set(lit.map(x => ((x % 12) + 12) % 12)), q = 9, H1 = 52, H2 = 30, names = PP_NOTES[lang];
  const top: [number, number, boolean][] = [[0, 3, true], [1, 2, false], [2, 2, true], [3, 2, false], [4, 3, true], [5, 3, true], [6, 2, false], [7, 2, true], [8, 2, false], [9, 2, true], [10, 2, false], [11, 3, true]];
  const wbg = (pc: number) => on.has(pc) ? NC[pc] : "#ffffff";
  const row1 = top.map(([pc, span, white]) => `<td colspan="${span}" width="${span * q}" height="${H1}" style="height:${H1}px;font-size:0;line-height:0;background:${white ? wbg(pc) : (on.has(pc) ? NC[pc] : C.night)};${pc === 4 ? `border-right:1px solid #cfcbe6;` : ""}${!white ? "border-radius:0 0 4px 4px;" : ""}">&nbsp;</td>`).join("");
  const W = [0, 2, 4, 5, 7, 9, 11];
  const row2 = W.map((pc, i) => `<td colspan="4" width="${4 * q}" height="${H2}" style="height:${H2}px;font-size:0;line-height:0;background:${wbg(pc)};${i < 6 ? "border-right:1px solid #cfcbe6;" : ""}">&nbsp;</td>`).join("");
  const row3 = W.map((pc, i) => `<td colspan="4" width="${4 * q}" align="center" style="padding-top:5px;font-family:${FONT};font-size:12px;font-weight:800;color:${on.has(pc) ? NC[pc] : "#b9b5dc"}">${on.has(pc) ? names[i] : "&nbsp;"}</td>`).join("");
  const cols = Array.from({ length: 28 }, () => `<td width="${q}" style="font-size:0;line-height:0;height:0">&nbsp;</td>`).join("");
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:10px auto 6px"><tr><td style="background:${C.night};border-radius:14px;padding:10px 10px 8px">
<table role="presentation" cellpadding="0" cellspacing="0" width="${28 * q}" style="table-layout:fixed;border-collapse:separate;width:${28 * q}px;border-radius:6px;overflow:hidden">
<tr style="height:0">${cols}</tr><tr>${row1}</tr><tr>${row2}</tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" width="${28 * q}" style="table-layout:fixed;width:${28 * q}px"><tr>${row3}</tr></table></td></tr></table>
${caption ? `<p class="pc-mut" style="margin:0 0 14px;text-align:center;font-size:13px;color:${C.mut}">${caption}</p>` : ""}`;
}
// 7 days in a row: done (violet ✓), missed (grey), today still to play (dashed orange)
function week(lang: Lang, labels: string[], state: ("on" | "off" | "today")[]) {
  const cell = (l: string, s: string) => `<td align="center" width="14%" style="padding:2px 0">
<div class="pc-mut" style="font-size:12px;font-weight:800;color:${s === "today" ? C.fire : C.mut};margin-bottom:5px">${l}</div>
<table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr><td align="center" width="30" height="30"${s === "off" ? ` class="pc-off"` : ""} style="width:30px;height:30px;border-radius:15px;${s === "on" ? `background:${C.vio};color:#fff` : s === "today" ? `border:2px dashed ${C.fire};color:${C.fire}` : `background:${C.line};color:${C.line}`};font-size:15px;font-weight:800;line-height:30px">${s === "on" ? "✓" : s === "today" ? "?" : "&nbsp;"}</td></tr></table></td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 14px"><tr><td class="pc-soft" style="background:${C.soft};border-radius:16px;padding:12px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${labels.map((l, i) => cell(l, state[i])).join("")}</tr></table></td></tr></table>`;
}
// weekday letters of the 7 days that end on `day` (YYYY-MM-DD)
const dayLetters = (lang: Lang, day: string) => Array.from({ length: 7 }, (_, i) => { const d = new Date(addDays(day, i - 6) + "T12:00:00Z"); return T[lang].days[(d.getUTCDay() + 6) % 7]; });
function layout(lang: Lang, p: Prefs, kind: string, title: string, inner: string, cta = SITE, btn?: string, x: Extra = {}) {
  const t = T[lang], u1 = `${FN}?unsub=${p.unsub_token}&k=${kind}`, u2 = `${FN}?unsub=${p.unsub_token}&k=all`, one = kind === "news"; // the welcome e-mail: only "all"
  const strip = NC.filter((_, i) => [0, 2, 4, 5, 7, 9, 11].includes(i)).map(c => `<td width="9" height="9" style="width:9px;height:9px;background:${c};border-radius:3px;font-size:0;line-height:0">&nbsp;</td><td width="4" style="font-size:0">&nbsp;</td>`).join("");
  const pre = x.pre ? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.lav}">${esc(x.pre)}${"&#8203;&nbsp;".repeat(40)}</div>` : "";
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(title)}</title>
<style>
body{margin:0;padding:0;-webkit-text-size-adjust:100%}
a{color:${C.vio}}
@media (max-width:620px){.pc-pad{padding-left:20px!important;padding-right:20px!important}.pc-h1{font-size:24px!important}}
@media (prefers-color-scheme:dark){.pc-bg{background:${C.night}!important}.pc-card{background:#1f1a40!important}.pc-tx{color:#f1f2fb!important}.pc-mut{color:#b9b5dc!important}.pc-soft{background:#2b2556!important}.pc-off{background:#3a3366!important;color:#3a3366!important}.pc-foot,.pc-foot a{color:#a9a5cf!important}}
</style></head>
<body class="pc-bg" style="margin:0;padding:0;background:${C.lav};font-family:${FONT};color:${C.ink}">${pre}
<table role="presentation" class="pc-bg" width="100%" cellpadding="0" cellspacing="0" style="background:${C.lav}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px">
<tr><td class="pc-pad" style="background:${C.night};border-radius:24px 24px 0 0;padding:18px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-family:${FONT_T};font-size:20px;font-weight:700;color:#ffffff"><a href="${SITE}" style="color:#ffffff;text-decoration:none">Piano Challenges</a></td>
<td align="right"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${strip}</tr></table></td></tr></table></td></tr>
<tr><td class="pc-card pc-tx pc-pad" style="background:#ffffff;padding:30px 32px 6px;font-size:16px;line-height:1.55;color:${C.ink}">${inner}</td></tr>
<tr><td class="pc-card pc-pad" align="center" style="background:#ffffff;border-radius:0 0 24px 24px;padding:10px 32px 30px">${button(cta, btn || t.play)}${x.after ? `<div style="margin-top:14px;font-size:14px">${x.after}</div>` : ""}</td></tr>
</table>
<p class="pc-foot" style="max-width:560px;font-size:12px;line-height:1.6;color:${C.mut};margin:18px auto 0;text-align:center">${t.why}<br>${one ? "" : `<a href="${u1}" style="color:${C.mut}">${t.unsubOne}</a> · `}<a href="${u2}" style="color:${C.mut}">${t.unsubAll}</a><br>${t.settings}</p>
</td></tr></table></body></html>`;
  return { html, unsub: one ? u2 : u1 };
}
let sentThisRun = 0;
async function send(to: string, subject: string, html: string, text: string, unsub: string) {
  if (!RESEND) throw new Error("RESEND_API_KEY missing");
  if (sentThisRun >= MAX_PER_RUN) return false;
  const body = JSON.stringify({ from: FROM, to: [to], subject, html, text, headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } });
  let r: Response | null = null;
  for (let tries = 0; tries < 3; tries++) { // a 429 (too many requests) is tried again a bit later
    r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": "Bearer " + RESEND, "Content-Type": "application/json" }, body });
    if (r.status !== 429) break; await sleep(1500 * (tries + 1));
  }
  sentThisRun++; await sleep(550); // 2 requests per second at most
  if (!r) return false;
  if (!r.ok) { console.error("resend", r.status, await r.text()); return false; }
  return true;
}

// ---------- the e-mails ----------
// each one returns { subject, pre (preheader), inner, text, cta (deep link), btn (button label) }; the jobs pass them to layout()
function welcomeMail(lang: Lang, _p: Prefs, name: string) {
  const fr = lang === "fr", n = esc(name), cta = GO("daily", "welcome");
  const subject = fr ? `Bienvenue, ${name} ! Ton premier Do t'attend 🎹` : `Welcome, ${name}! Your first C is waiting 🎹`;
  const pre = fr ? "Branche ton clavier, joue un Do : en 5 minutes, tes premiers accords. Ta progression te suit partout." : "Plug in your keyboard, play a C: your first chords in 5 minutes. Your progress follows you everywhere.";
  const step = (i: number, s: string) => `<tr><td width="34" valign="top" style="padding:0 0 12px"><div style="width:26px;height:26px;border-radius:13px;background:${NC[[0, 4, 7][i - 1]]};color:${C.ink};font-family:${FONT_T};font-weight:700;font-size:14px;line-height:26px;text-align:center">${i}</div></td><td class="pc-tx" style="padding:2px 0 12px;font-size:15px;line-height:1.5;color:${C.ink}">${s}</td></tr>`;
  const inner = kick(fr ? "Bienvenue" : "Welcome") + h1(fr ? `Bienvenue, ${n} !` : `Welcome, ${n}!`)
    + para(fr ? "Ton compte est prêt : ta progression, ta série et ton ELO te suivent maintenant sur tous tes appareils." : "Your account is ready: your progress, streak and ELO now follow you on all your devices.")
    + keys(lang, [0], fr ? "Un Do seul suffit pour lancer l'exercice (n'importe lequel)." : "A lone C starts the exercise (any C).")
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 8px">`
    + step(1, fr ? "<b>Branche ton clavier</b> (USB ou Bluetooth) : il est reconnu tout seul. Pas de clavier ? Le micro ou l'écran marchent aussi." : "<b>Plug in your keyboard</b> (USB or Bluetooth): it is detected by itself. No keyboard? The mic or the screen work too.")
    + step(2, fr ? "<b>Fais l'entraînement du jour</b> : 10 exercices, environ 5 minutes." : "<b>Do the daily practice</b>: 10 exercises, about 5 minutes.")
    + step(3, fr ? "<b>Reviens demain</b> : chaque jour joué allonge ta série 🔥." : "<b>Come back tomorrow</b>: every day you play makes your streak longer 🔥.")
    + `</table>` + box(fr ? "<b>Le conseil qui change tout :</b> 5 minutes par jour valent mieux qu'une heure le dimanche. Ta série est là pour t'y aider." : "<b>The tip that changes everything:</b> 5 minutes a day beat one hour on Sunday. Your streak is there to help.", "💡");
  const text = `${fr ? `Bienvenue, ${name} !` : `Welcome, ${name}!`}\n\n${fr ? "Ton compte Piano Challenges est prêt : ta progression, ta série et ton ELO te suivent sur tous tes appareils." : "Your Piano Challenges account is ready: your progress, streak and ELO follow you on all your devices."}\n\n`
    + (fr ? "1. Branche ton clavier (USB ou Bluetooth), ou joue au micro ou sur l'écran.\n2. Fais l'entraînement du jour : 10 exercices, environ 5 minutes.\n3. Reviens demain : chaque jour joué allonge ta série.\n\nCommencer l'entraînement du jour : "
      : "1. Plug in your keyboard (USB or Bluetooth), or play with the mic or on the screen.\n2. Do the daily practice: 10 exercises, about 5 minutes.\n3. Come back tomorrow: every day you play makes your streak longer.\n\nStart the daily practice: ") + cta + `\n\n${T[lang].textSet}`;
  return { subject, pre, inner, text, cta, btn: fr ? "Commencer l'entraînement du jour" : "Start the daily practice" };
}
const STREAK_STEPS = [7, 14, 30, 50, 100, 200, 365, 500, 1000];
function streakMail(lang: Lang, name: string, days: number) {
  const fr = lang === "fr", n = esc(name), cta = GO("daily", "streak"), next = STREAK_STEPS.find(s => s > days + 1), today = parisDay();
  const subject = fr ? `🔥 ${days} jours d'affilée : on continue ?` : `🔥 ${days} days in a row: keep it going?`;
  const pre = fr ? `10 minutes de piano avant minuit et ta série passe à ${days + 1} jours.` : `10 minutes of piano before midnight and your streak goes to ${days + 1} days.`;
  const state = Array.from({ length: 7 }, (_, i) => i === 6 ? "today" as const : (6 - i <= days ? "on" as const : "off" as const));
  const inner = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:0 0 4px"><div style="font-size:46px;line-height:1">🔥</div>
<div style="font-family:${FONT_T};font-size:56px;font-weight:700;line-height:1.05;color:${C.fire}">${days}</div><div class="pc-mut" style="font-size:14px;font-weight:800;color:${C.mut};text-transform:uppercase;letter-spacing:.06em">${fr ? "jours d'affilée" : "days in a row"}</div></td></tr></table>`
    + week(lang, dayLetters(lang, today), state)
    + para(fr ? `${n}, ta série tient à <b>10 minutes de jeu</b> aujourd'hui : elle passe à <b>${days + 1} jours</b> dès que tu les as jouées.` : `${n}, your streak needs <b>10 minutes of play</b> today: it goes to <b>${days + 1} days</b> as soon as you have played them.`)
    + (next ? para(fr ? `Encore ${next - days} jours et tu atteins le palier des <b>${next} jours</b>.` : `${next - days} more days and you reach the <b>${next}-day</b> milestone.`) : "")
    + muted(fr ? "Pas le temps aujourd'hui ? Un gel (gagné tous les 7 jours de série) protège ta série tout seul, sans rien faire." : "No time today? A freeze (earned every 7 days of streak) protects your streak by itself.");
  const text = `${fr ? `🔥 ${days} jours d'affilée, ${name} !` : `🔥 ${days} days in a row, ${name}!`}\n\n${fr ? `10 minutes de piano avant minuit et ta série passe à ${days + 1} jours.` : `10 minutes of piano before midnight and your streak goes to ${days + 1} days.`}\n\n${fr ? "Garder ma série : " : "Keep my streak: "}${cta}\n\n${T[lang].textSet}`;
  return { subject, pre, inner, text, cta, btn: fr ? "Garder ma série" : "Keep my streak" };
}
// on: the 7 days that end today, played or not; prevXp: XP of the 7 days before; need: XP of the current level (for the bar)
type Week = { xp: number; days: number; streak: number; level: number; toNext: number; rank: number | null; games: number; elo: { label: string; r: number; d: number } | null;
  on?: boolean[]; prevXp?: number; need?: number; day?: string };
function weeklyMail(lang: Lang, name: string, w: Week) {
  const fr = lang === "fr", n = esc(name), cta = GO("daily", "weekly"), s = (k: number) => k > 1 ? "s" : "";
  const up = w.prevXp != null && w.prevXp > 0 ? Math.round((w.xp - w.prevXp) / w.prevXp * 100) : null;
  const rk = (r: number) => fr ? `${r}${r === 1 ? "er" : "e"}` : `#${r}`;
  // the subject leads with the best news of the week
  const subject = up != null && up >= 10 ? (fr ? `📈 +${up} % d'XP cette semaine, ${name} !` : `📈 +${up}% XP this week, ${name}!`)
    : w.streak >= 7 ? (fr ? `🔥 ${w.streak} jours de série : ta semaine au piano` : `🔥 ${w.streak}-day streak: your piano week`)
    : (fr ? `Ta semaine au piano : ${w.xp} XP en ${w.days} jour${s(w.days)}` : `Your piano week: ${w.xp} XP in ${w.days} day${s(w.days)}`);
  const goalDays = w.days >= 5 ? 7 : Math.min(7, w.days + 2);
  const goal = w.days >= 5 ? (fr ? "Garde ce rythme : vise 7 jours sur 7 la semaine prochaine." : "Keep it up: aim for 7 days out of 7 next week.")
    : (fr ? `Objectif de la semaine prochaine : jouer ${goalDays} jours (5 minutes suffisent).` : `Next week's goal: play on ${goalDays} days (5 minutes are enough).`);
  const pre = fr ? `Niveau ${w.level} : plus que ${w.toNext} XP pour le niveau ${w.level + 1}. ${goal}` : `Level ${w.level}: ${w.toNext} XP to level ${w.level + 1}. ${goal}`;
  const cmp = up == null ? "" : up > 0 ? (fr ? `<b style="color:#1f9d5c">+${up} %</b> d'XP par rapport à la semaine dernière.` : `<b style="color:#1f9d5c">+${up}%</b> XP compared with last week.`)
    : up === 0 ? (fr ? "Autant d'XP que la semaine dernière : régulier !" : "As much XP as last week: steady!")
    : (fr ? `Un peu moins que la semaine dernière (${w.prevXp} XP) : chaque semaine compte, même les petites.` : `A bit less than last week (${w.prevXp} XP): every week counts, small ones too.`);
  const need = w.need || (w.toNext + 1);
  const inner = kick(fr ? "Ton récap de la semaine" : "Your weekly recap") + h1(fr ? `${n}, voici ta semaine` : `${n}, here is your week`)
    + stats([[String(w.xp), "XP"], [`${w.days}/7`, fr ? "jours joués" : "days played"], ["🔥 " + w.streak, fr ? "série" : "streak"]])
    + (w.on && w.on.length === 7 ? week(lang, dayLetters(lang, w.day || parisDay()), w.on.map(b => b ? "on" : "off")) : "")
    + (cmp ? para(cmp) : "")
    + para(fr ? `<b>Niveau ${w.level}</b> · encore <b>${w.toNext} XP</b> pour le niveau ${w.level + 1}` : `<b>Level ${w.level}</b> · <b>${w.toNext} XP</b> to level ${w.level + 1}`, "margin-bottom:4px") + bar(1 - w.toNext / need)
    + `<div style="height:10px;line-height:10px">&nbsp;</div>`
    + (w.rank ? para(fr ? `🏆 Tu es <b>${rk(w.rank)}</b> au classement de la semaine.` : `🏆 You are <b>${rk(w.rank)}</b> on the weekly leaderboard.`) : "")
    + (w.games ? para((fr ? `⚔️ ${w.games} duel${s(w.games)} classé${s(w.games)}` : `⚔️ ${w.games} rated duel${s(w.games)}`) + (w.elo ? ` · ${esc(w.elo.label)} : <b>${w.elo.r}</b> (${w.elo.d >= 0 ? "+" : ""}${w.elo.d})` : "") + ".") : "")
    + box(`<b>${goal}</b>`, "🎯");
  const text = `${fr ? `${name}, voici ta semaine :` : `${name}, here is your week:`}\n${fr ? `${w.xp} XP · ${w.days}/7 jours joués · série de ${w.streak}` : `${w.xp} XP · ${w.days}/7 days played · ${w.streak}-day streak`}\n${fr ? `Niveau ${w.level} : encore ${w.toNext} XP pour le niveau ${w.level + 1}.` : `Level ${w.level}: ${w.toNext} XP to level ${w.level + 1}.`}${w.rank ? (fr ? `\nClassement de la semaine : ${rk(w.rank)}.` : `\nWeekly leaderboard: ${rk(w.rank)}.`) : ""}\n${goal}\n\n${fr ? "Commencer ma semaine : " : "Start my week: "}${cta}\n${fr ? "Ma progression : " : "My progress: "}${GO("progress", "weekly")}\n\n${T[lang].textSet}`;
  return { subject, pre, inner, text, cta, btn: fr ? "Commencer ma semaine" : "Start my week",
    after: `<a href="${GO("progress", "weekly")}" style="color:${C.vio};font-weight:700;text-decoration:none">${fr ? "Voir toute ma progression ›" : "See all my progress ›"}</a>` };
}
const GAME = { fr: { runner: "Saute-notes", speed: "Contre la montre", memory: "Mémoire musicale", douze: "Les Douze" }, en: { runner: "Note Jumper", speed: "Time attack", memory: "Musical memory", douze: "The Twelve" } } as const;

// the First steps (14 lessons): titles and what each one teaches, with the note names of the language (same texts as the app, ppTi / ppCan)
const PP_NOTES = { fr: ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"], en: ["C", "D", "E", "F", "G", "A", "B"] } as const;
const PP_MIN = [2, 2, 2, 3, 2, 2, 3, 3, 3, 2, 3, 3, 3, 3];
// the keys each lesson lights on the keyboard of the e-mail (pitch classes)
const PP_KEYS = [[1, 3, 6, 8, 10], [0], [0, 2, 4], [5, 7, 9, 11], [0, 2, 4, 5, 7, 9, 11], [0], [0, 2, 4, 5, 7], [0, 2, 4], [0], [0, 4, 7], [5, 9, 0], [0, 4, 7], [0, 7], [0, 4, 7]];
function ppLesson(lang: Lang, i: number) {
  const [C, D, E, F, G, A, B] = PP_NOTES[lang];
  const fr = {
    ti: ["Le clavier se répète", `Trouve tous les ${C}`, `${D} et ${E}`, `${F}, ${G}, ${A}, ${B}`, "Les 7 notes en éclair", "Grave, aigu, octave", "Ta main, tes doigts", "Ta première mélodie", "Joue avec la pulsation", "Ton premier accord", `${F} et ${G} : même forme`, "Changer d'accord en rythme", "La main gauche entre en jeu", "Ton premier morceau"],
    can: ["Tu vas repérer les groupes de 2 et de 3 touches noires : ta boussole sur le clavier.", `Tu vas trouver un ${C} en une seconde, et le ${C} central.`, `Tu vas jouer ${C}, ${D} et ${E}.`, `Tu vas trouver les 4 notes autour des 3 touches noires, sans compter.`, "Tu vas nommer n'importe quelle touche blanche en un éclair.", "Tu vas te déplacer sur tout le clavier, du grave à l'aigu.", `Tu vas poser ta main en position de ${C} : un doigt par touche.`, "Tu vas jouer ta première mélodie : Au clair de la lune.", "Tu vas jouer en rythme avec le clic.", `Tu vas jouer ${C} majeur, ton premier accord.`, `Tu vas jouer ${F} et ${G} majeurs : de quoi accompagner des centaines de chansons.`, "Tu vas changer d'accord en rythme.", "Tu vas jouer avec les deux mains.", "Tu vas accompagner un morceau en entier."],
  };
  const en = {
    ti: ["The keyboard repeats", `Find every ${C}`, `${D} and ${E}`, `${F}, ${G}, ${A}, ${B}`, "All 7 notes, fast", "Low, high, octave", "Your hand, your fingers", "Your first melody", "Play with the beat", "Your first chord", `${F} and ${G}: same shape`, "Change chords in time", "The left hand joins in", "Your first song"],
    can: ["You'll spot the groups of 2 and 3 black keys: your compass on the keyboard.", `You'll find a ${C} in a second, and middle ${C}.`, `You'll play ${C}, ${D} and ${E}.`, "You'll find the 4 notes around the 3 black keys, without counting.", "You'll name any white key in a flash.", "You'll move all over the keyboard, from low to high.", `You'll place your hand in ${C} position: one finger per key.`, "You'll play your first melody: Au clair de la lune.", "You'll play in time with the click.", `You'll play ${C} major, your first chord.`, `You'll play ${F} and ${G} major: enough for hundreds of songs.`, "You'll change chords in time.", "You'll play with both hands.", "You'll play a whole song."],
  };
  const L = lang === "fr" ? fr : en; return { n: i + 1, ti: L.ti[i], can: L.can[i], min: PP_MIN[i], keys: PP_KEYS[i] };
}
// D24: the lesson (title, what you learn, the keys it uses, how far along the 14 you are) and one button that opens that lesson (?go=pp)
function pathMail(lang: Lang, name: string, lessonId: string, n: number, kind: "remind" | "kept") {
  const fr = lang === "fr", i = Math.max(0, Math.min(13, parseInt(lessonId.slice(1), 10) - 1 || 0)), L = ppLesson(lang, i), left = 14 - i, done = i, s = (k: number) => k > 1 ? "s" : "";
  const cta = GO("pp", kind === "kept" ? "kept" : "remind"), nm = esc(name);
  const progress = para(fr ? `<b>${done} leçon${s(done)} faite${s(done)}</b> sur 14 · plus que ${left}` : `<b>${done} lesson${s(done)} done</b> out of 14 · ${left} to go`, "margin-bottom:4px;font-size:14px") + bar(done / 14, NC[5]);
  const lesson = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 10px"><tr><td class="pc-soft" style="background:${C.soft};border-radius:18px;padding:16px 18px">
${kick((fr ? "Leçon " : "Lesson ") + L.n + " · " + L.min + " min", C.vio)}<div class="pc-tx" style="font-family:${FONT_T};font-size:21px;font-weight:700;color:${C.ink};margin:0 0 6px">${esc(L.ti)}</div>
<div class="pc-tx" style="font-size:15px;line-height:1.5;color:${C.ink}">${esc(L.can)}</div></td></tr></table>`;
  if (kind === "kept") {
    const subject = fr ? `${name}, ta place est gardée 🎹` : `${name}, your spot is kept 🎹`;
    const pre = fr ? `Tes Premiers pas t'attendent, sans rappel. La leçon ${L.n} prend ${L.min} minutes, quand tu veux.` : `Your First steps are waiting, no more reminders. Lesson ${L.n} takes ${L.min} minutes, whenever you like.`;
    const inner = kick(fr ? "Premiers pas" : "First steps") + h1(fr ? "Ta place est gardée" : "Your spot is kept")
      + para(fr ? `${nm}, tes Premiers pas restent exactement là où tu les as laissés.` : `${nm}, your First steps stay exactly where you left them.`) + progress + lesson
      + muted(fr ? "Pour ne pas t'encombrer, on arrête les rappels de leçon. Quand tu auras envie de rejouer, tout sera prêt : un Do suffit pour reprendre." : "So as not to clutter your inbox, we stop the lesson reminders. Whenever you feel like playing again, everything is ready: a C is enough to pick up.");
    return { subject, pre, inner, cta, btn: fr ? `Reprendre la leçon ${L.n}` : `Pick up lesson ${L.n}`,
      text: `${fr ? `${name}, ta place est gardée.` : `${name}, your spot is kept.`}\n${fr ? `${done} leçon${s(done)} faite${s(done)} sur 14. Leçon ${L.n} : ${L.ti} (${L.min} min).` : `${done} lesson${s(done)} done out of 14. Lesson ${L.n}: ${L.ti} (${L.min} min).`}\n${fr ? "On arrête les rappels de leçon ; tout reste prêt quand tu veux." : "We stop the lesson reminders; everything stays ready whenever you like."}\n\n${fr ? "Reprendre : " : "Pick up: "}${cta}\n\n${T[lang].textSet}`,
      title: fr ? "Ta place est gardée" : "Your spot is kept", body: fr ? "Tes Premiers pas t'attendent, quand tu veux." : "Your First steps are waiting, whenever you like." };
  }
  // the subject changes from one reminder to the next (never twice the same in a row)
  const subjects = fr ? [`Leçon ${L.n} : ${L.ti} (${L.min} min)`, i === 7 ? "🎵 Ta première mélodie t'attend" : `${L.min} minutes pour la leçon ${L.n} ?`, `On reprend ? ${L.ti} t'attend`]
    : [`Lesson ${L.n}: ${L.ti} (${L.min} min)`, i === 7 ? "🎵 Your first melody is waiting" : `${L.min} minutes for lesson ${L.n}?`, `Shall we go on? ${L.ti} is waiting`];
  const subject = subjects[Math.max(0, Math.min(2, n))];
  const pre = `${L.can} ${fr ? `${L.min} minutes suffisent.` : `${L.min} minutes are enough.`}`;
  const inner = kick(fr ? "Premiers pas" : "First steps") + h1(fr ? `${nm}, ta leçon ${L.n} t'attend` : `${nm}, lesson ${L.n} is waiting`) + lesson
    + keys(lang, L.keys, fr ? "Les touches de la leçon" : "The keys of the lesson") + progress;
  const text = `${fr ? `Leçon ${L.n} · ${L.ti} (${L.min} min)` : `Lesson ${L.n} · ${L.ti} (${L.min} min)`}\n${L.can}\n${fr ? `${done} leçon${s(done)} faite${s(done)} sur 14.` : `${done} lesson${s(done)} done out of 14.`}\n\n${fr ? `Jouer la leçon ${L.n} : ` : `Play lesson ${L.n}: `}${cta}\n\n${T[lang].textSet}`;
  return { subject, pre, inner, text, cta, btn: fr ? `Jouer la leçon ${L.n}` : `Play lesson ${L.n}`, title: fr ? `Ta leçon ${L.n} t'attend` : `Lesson ${L.n} is waiting`, body: `${L.ti} · ${L.min} min` };
}

// ---------- jobs ----------
async function jobWelcome() {
  const since = Date.now() - 3 * 86400000; let page = 1, sent = 0;
  while (page < 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 }); if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (!u.email || Date.parse(u.created_at) < since || (!u.email_confirmed_at && !u.confirmed_at)) continue;
      const lang = await langOf(u.id), p = await ensurePrefs(u.id, lang); if (p.welcome_sent_at) continue;
      const { data: prof } = await db.from("profiles").select("name").eq("id", u.id).maybeSingle();
      const m = welcomeMail(p.lang, p, prof?.name || (p.lang === "fr" ? "musicien" : "musician")), l = layout(p.lang, p, "news", m.subject, m.inner, m.cta, m.btn, m);
      if (await send(u.email, m.subject, l.html, m.text, l.unsub)) { sent++; await db.from("notif_prefs").update({ welcome_sent_at: new Date().toISOString() }).eq("user_id", u.id); }
    }
    if (data.users.length < 200) break; page++;
  }
  return { sent };
}
async function jobStreak() {
  // Série 10 min (27/10/2026) : dans l'app, un jour compte quand on a joué 10 minutes (avant la bascule : tout jour avec de l'XP).
  // Ici « joué » = une ligne xp_log > 0 : quelqu'un qui a gagné de l'XP aujourd'hui sans atteindre 10 min ne reçoit pas de rappel
  // (écart connu, accepté) ; profiles.streak (envoyé par l'app, effStreak) suit déjà la règle des 10 minutes.
  const today = parisDay(), yest = addDays(today, -1);
  const y = await allRows<{ user_id: string }>(() => db.from("xp_log").select("user_id").eq("day", yest).gt("xp", 0));
  const tdy = await allRows<{ user_id: string }>(() => db.from("xp_log").select("user_id").eq("day", today).gt("xp", 0));
  const playedToday = new Set(tdy.map(r => r.user_id));
  const ids = [...new Set(y.map(r => r.user_id))].filter(id => !playedToday.has(id)); if (!ids.length) return { sent: 0 };
  const profs = (await profilesOf(ids, "id,name,streak")).filter((p: { streak: number }) => (p.streak || 0) >= 3);
  const prefs = await prefsFor(ids); let sent = 0;
  for (const pr of profs || []) {
    let p = prefs.get(pr.id); if (p && (!p.email_streak || p.last_streak_mail === today || p.last_weekly_mail === today || p.last_path_mail === today)) continue;
    const email = await emailOf(pr.id); if (!email) continue;
    if (!p) p = await ensurePrefs(pr.id, await langOf(pr.id));
    const m = streakMail(p.lang, pr.name || (p.lang === "fr" ? "musicien" : "musician"), pr.streak), l = layout(p.lang, p, "streak", m.subject, m.inner, m.cta, m.btn, m);
    await notifyRow(pr.id, "streak", "remind", p.lang === "fr" ? `Ta série de ${pr.streak} jours est en danger` : `Your ${pr.streak}-day streak is in danger`, p.lang === "fr" ? "Joue 10 minutes avant minuit pour la garder." : "Play 10 minutes before midnight to keep it.", "daily");
    if (await send(email, m.subject, l.html, m.text, l.unsub)) { sent++; await db.from("notif_prefs").update({ last_streak_mail: today }).eq("user_id", pr.id); }
  }
  return { sent };
}
async function jobPath() {
  const { data, error } = await db.rpc("path_due", {}); if (error) { console.error("path_due", error.message); return { error: error.message }; }
  const rows = (data || []) as { user_id: string; lang: Lang; kind: "remind" | "kept"; lesson: string; n: number; local_day: string }[];
  const prefs = await prefsFor(rows.map(r => r.user_id)); let sent = 0;
  for (const r of rows) {
    const p = prefs.get(r.user_id); if (!p || !p.email_streak) continue;
    const email = await emailOf(r.user_id); if (!email) continue;
    const { data: prof } = await db.from("profiles").select("name").eq("id", r.user_id).maybeSingle();
    const lang: Lang = p.lang === "en" ? "en" : "fr", m = pathMail(lang, prof?.name || (lang === "fr" ? "musicien" : "musician"), r.lesson || "p01", r.n | 0, r.kind);
    // the button opens the app on the lesson itself (?go=pp; the hub and its « Pick up » card (D8) if the app cannot)
    const l = layout(lang, p, "streak", m.subject, m.inner, m.cta, m.btn, m);
    await notifyRow(r.user_id, "path", "remind", m.title, m.body, "hub");
    if (await send(email, m.subject, l.html, m.text, l.unsub)) sent++;
    await db.rpc("path_mark", { p_user: r.user_id, p_kind: r.kind, p_day: r.local_day, p_n: r.n | 0 }); // counted even if Resend failed: never twice a day
  }
  return { sent };
}
async function weekOf(id: string, since: string, rankMap: Map<string, number>, lang: Lang): Promise<Week> {
  const [{ data: logs }, { data: prof }, { data: prog }] = await Promise.all([
    db.from("xp_log").select("day,xp").eq("user_id", id).gte("day", addDays(since, -7)), // this week and the one before (for the comparison)
    db.from("profiles").select("xp,level,streak").eq("id", id).maybeSingle(),
    db.from("progress").select("data").eq("user_id", id).maybeSingle()]);
  const all = (logs || []) as { day: string; xp: number }[], cur = all.filter(r => r.day >= since), prev = all.filter(r => r.day < since);
  const xp = cur.reduce((a, r) => a + (r.xp || 0), 0), played = new Set(cur.filter(r => r.xp > 0).map(r => r.day)), days = played.size;
  const prevXp = prev.reduce((a, r) => a + (r.xp || 0), 0), on = Array.from({ length: 7 }, (_, i) => played.has(addDays(since, i)));
  const li = levelInfo(prof?.xp || 0);
  let games = 0, elo: Week["elo"] = null;
  const E = prog?.data?.elo || {};
  for (const [k, e] of Object.entries(E) as [string, { r: number; h?: { d: string; dd?: number }[] }][]) {
    const wk = (e.h || []).filter(h => h.d >= since); if (!wk.length) continue; games += wk.length;
    const d = wk.reduce((a, h) => a + (h.dd || 0), 0), [g, c] = k.split("-");
    if (!elo || Math.abs(d) > Math.abs(elo.d)) elo = { label: ((GAME[lang] as Record<string, string>)[g] || g) + (c === "notes" ? (lang === "fr" ? " · notes" : " · notes") : (lang === "fr" ? " · accords" : " · chords")), r: e.r, d };
  }
  return { xp, days, streak: prof?.streak || 0, level: li.L, toNext: li.need - li.into, rank: rankMap.get(id) || null, games, elo, on, prevXp, need: li.need, day: addDays(since, 6) };
}
async function jobWeekly(only?: string) {
  const today = parisDay(), since = addDays(today, -6), active = addDays(today, -27);
  let ids: string[];
  if (only) ids = [only];
  else { const data = await allRows<{ user_id: string }>(() => db.from("xp_log").select("user_id").gte("day", active).gt("xp", 0)); ids = [...new Set(data.map(r => r.user_id))]; }
  const { data: lb } = await db.rpc("leaderboard", { since }); const rankMap = new Map<string, number>(); (lb || []).forEach((r: { id: string }, i: number) => rankMap.set(r.id, i + 1));
  const prefs = await prefsFor(ids); let sent = 0;
  for (const id of ids) {
    let p = prefs.get(id); if (!only && p && (!p.email_weekly || p.last_weekly_mail === today)) continue;
    const email = await emailOf(id); if (!email) continue;
    if (!p) p = await ensurePrefs(id, await langOf(id));
    const { data: prof } = await db.from("profiles").select("name").eq("id", id).maybeSingle();
    const w = await weekOf(id, since, rankMap, p.lang); if (!only && w.xp <= 0) continue;
    const m = weeklyMail(p.lang, prof?.name || (p.lang === "fr" ? "musicien" : "musician"), w), l = layout(p.lang, p, "weekly", m.subject, m.inner, m.cta, m.btn, m);
    await notifyRow(id, "recap", "progress", p.lang === "fr" ? "Ton récap de la semaine" : "Your weekly recap", p.lang === "fr" ? `${w.xp} XP, ${w.days}/7 jours, série de ${w.streak}.` : `${w.xp} XP, ${w.days}/7 days, ${w.streak}-day streak.`, "progress");
    if (await send(email, m.subject, l.html, m.text, l.unsub)) { sent++; if (!only) await db.from("notif_prefs").update({ last_weekly_mail: today }).eq("user_id", id); }
  }
  return { sent };
}
async function jobPreview(id: string) {
  const email = await emailOf(id); if (!email) return { error: "no confirmed e-mail" };
  const p = await ensurePrefs(id, await langOf(id)); const { data: prof } = await db.from("profiles").select("name,streak").eq("id", id).maybeSingle();
  const nm = prof?.name || (p.lang === "fr" ? "musicien" : "musician"), w = welcomeMail(p.lang, p, nm), lw = layout(p.lang, p, "news", w.subject, w.inner, w.cta, w.btn, w); await send(email, "[test] " + w.subject, lw.html, w.text, lw.unsub);
  const s = streakMail(p.lang, nm, Math.max(3, prof?.streak || 3)), ls = layout(p.lang, p, "streak", s.subject, s.inner, s.cta, s.btn, s); await send(email, "[test] " + s.subject, ls.html, s.text, ls.unsub);
  const pm = pathMail(p.lang, nm, "p04", 0, "remind"), lp = layout(p.lang, p, "streak", pm.subject, pm.inner, pm.cta, pm.btn, pm); await send(email, "[test] " + pm.subject, lp.html, pm.text, lp.unsub);
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
const CORS = { "Access-Control-Allow-Origin": "https://pianochallenges.com", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type", "Vary": "Origin" };
const same = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }; // constant time

Deno.serve(async (req) => {
  sentThisRun = 0; // the worker is reused between requests: the cap is per run
  const url = new URL(req.url), token = url.searchParams.get("unsub"), k = url.searchParams.get("k") || "all";
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (token && req.method === "GET") { // the link in the e-mail: confirmation on the site
    const to = new URL(SITE); to.searchParams.set("unsub", token); to.searchParams.set("k", COLS[k] ? k : "all");
    return new Response(null, { status: 302, headers: { Location: to.toString() } });
  }
  if (token && req.method === "POST") { const lang = await unsubscribe(token, k); return Response.json({ ok: !!lang, lang }, { headers: CORS }); }
  if (req.method !== "POST" || !SECRET || !same(req.headers.get("x-notify-secret") || "", SECRET)) return new Response("forbidden", { status: 403 });
  let body: { job?: string; user_id?: string } = {}; try { body = await req.json(); } catch (_) { /* empty */ }
  try {
    const out = body.job === "welcome" ? await jobWelcome() : body.job === "streak" ? await jobStreak() : body.job === "weekly" ? await jobWeekly() : body.job === "path" ? await jobPath()
      : body.job === "preview" && body.user_id ? await jobPreview(body.user_id) : { error: "unknown job" };
    return Response.json(out);
  } catch (e) { console.error(e); return Response.json({ error: String(e) }, { status: 500 }); }
});
