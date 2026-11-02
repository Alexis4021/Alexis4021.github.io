// Alan Fest 21 — RSVP: valida el formulario y manda los correos por Brevo.
// Secretos (Supabase > Edge Functions > Secrets): BREVO_API_KEY
// Opcionales: SENDER_EMAIL, HOST_EMAIL

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "fourier.alandev@gmail.com";
const HOST_EMAIL = Deno.env.get("HOST_EMAIL") ?? "alexis.chavez@hotmail.com";
const SENDER_NAME = "Alan Fest 21";

const ADDRESS = "C. Nottingham 310, Pedregal de Linda Vista 2o Sector 2a Etapa, 67112 Guadalupe, N.L.";
const MAPS_URL = "https://maps.app.goo.gl/GyfLFKH36MazwqAb8";
const PLAYLIST_URL = "https://open.spotify.com/playlist/6LdZAYWJHKMR4T0cm3PbGl";

const ALLOWED_ORIGINS = [
  "https://alexis4021.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

// Límite básico por IP (se reinicia si la función se recicla).
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

function rateLimited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_LIMIT;
}

function escapeHtml(str: unknown) {
  return String(str ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function clean(v: unknown, max: number) {
  return String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function codeFrom(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return "AF21-" + String(h % 10000).padStart(4, "0");
}

interface Rsvp {
  attending: boolean;
  name: string;
  age: number;
  email: string;
  guestCount: number;
  guestNames: string;
  message: string;
}

function parse(body: Record<string, unknown>): Rsvp | string {
  const attending = body.attending === true || body.attending === "si";
  const name = clean(body.name, 80);
  const age = Number(body.age);
  const email = clean(body.email, 120);
  const hasGuests = attending && (body.hasGuests === true || body.hasGuests === "si");
  const guestCount = hasGuests ? Math.max(1, Math.min(10, Math.floor(Number(body.guestCount) || 1))) : 0;

  if (name.length < 2) return "name";
  if (!(age >= 1 && age <= 120)) return "age";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "email";

  return {
    attending,
    name,
    age: Math.floor(age),
    email,
    guestCount,
    guestNames: hasGuests ? clean(body.guestNames, 400) : "",
    message: String(body.message ?? "").trim().slice(0, 500),
  };
}

function emailShell(inner: string) {
  return '<div style="margin:0;padding:24px;background:#120a1f;font-family:Arial,Helvetica,sans-serif;color:#fff7ec">' +
    '<div style="max-width:560px;margin:0 auto;background:#1c1030;border-radius:16px;overflow:hidden">' +
    '<div style="padding:28px 24px;background:linear-gradient(135deg,#ff7a1a,#ff2e88);text-align:center">' +
    '<div style="font-size:40px;font-weight:900;letter-spacing:2px;color:#fff">ALAN FEST <span style="background:#120a1f;padding:0 8px;border-radius:6px">21</span></div>' +
    '<div style="margin-top:6px;font-size:14px;letter-spacing:3px;color:#fff">SÁB 21 NOV 2026 · 5:00 PM</div></div>' +
    '<div style="padding:24px">' + inner + "</div></div></div>";
}

function row(label: string, val: unknown) {
  return '<tr><td style="padding:6px 12px 6px 0;color:#c9b8dc;vertical-align:top">' + label +
    '</td><td style="padding:6px 0;color:#fff7ec"><b>' + escapeHtml(val) + "</b></td></tr>";
}

function hostEmail(s: Rsvp, code: string) {
  return {
    to: [{ email: HOST_EMAIL, name: "Alan" }],
    replyTo: { email: s.email, name: s.name },
    subject: (s.attending ? "✅ RSVP: " : "❌ No asistirá: ") + s.name + (s.guestCount ? ` (+${s.guestCount})` : ""),
    htmlContent: emailShell(
      '<h2 style="margin:0 0 12px;color:#ffd23f">' + (s.attending ? "Nuevo RSVP confirmado" : "Alguien no podrá ir") + "</h2>" +
        '<table style="border-collapse:collapse;font-size:15px">' +
        row("Nombre", s.name) + row("Edad", s.age) + row("Correo", s.email) +
        row("Asiste", s.attending ? "Sí" : "No") +
        row("Invitados", s.guestCount ? String(s.guestCount) : "Ninguno") +
        (s.guestNames ? row("Nombres", s.guestNames) : "") +
        (s.message ? row("Mensaje", s.message) : "") +
        row("Folio", code) +
        "</table>",
    ),
  };
}

function guestEmail(s: Rsvp, code: string) {
  const first = s.name.split(" ")[0];
  const inner = s.attending
    ? '<h2 style="margin:0 0 8px;color:#ffd23f">¡Ya tienes tu pulsera, ' + escapeHtml(first) + "! 🤘</h2>" +
      '<p style="margin:0 0 16px;line-height:1.5">Tu lugar en <b>Alan Fest 21</b> está confirmado' +
      (s.guestCount ? " para ti y " + s.guestCount + " invitado" + (s.guestCount > 1 ? "s" : "") : "") + ".</p>" +
      '<div style="background:linear-gradient(135deg,#ffd23f,#ff7a1a);color:#120a1f;border-radius:12px;padding:16px;margin:0 0 18px">' +
      '<div style="font-size:12px;letter-spacing:3px;font-weight:bold">GENERAL ACCESS' + (s.guestCount ? " +" + s.guestCount : "") + "</div>" +
      '<div style="font-size:26px;font-weight:900;text-transform:uppercase">' + escapeHtml(s.name) + "</div>" +
      '<div style="font-family:monospace;font-size:13px;opacity:.8">' + code + "</div></div>" +
      '<p style="margin:0 0 6px"><b style="color:#ff2e88">Line-up:</b> música en vivo · karaoke · beer pong · fiesta</p>' +
      '<p style="margin:0 0 6px"><b style="color:#ff2e88">Cuándo:</b> sábado 21 de noviembre 2026, 5:00 PM</p>' +
      '<p style="margin:0 0 18px"><b style="color:#ff2e88">Dónde:</b> ' + escapeHtml(ADDRESS) + "</p>" +
      '<p style="margin:0 0 10px"><a href="' + MAPS_URL + '" style="display:inline-block;background:#ff2e88;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">Cómo llegar</a> ' +
      '<a href="' + PLAYLIST_URL + '" style="display:inline-block;background:#1ed760;color:#0b1a10;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">Playlist</a></p>'
    : '<h2 style="margin:0 0 8px;color:#ffd23f">Gracias por avisar, ' + escapeHtml(first) + "</h2>" +
      '<p style="margin:0;line-height:1.5">Te vamos a extrañar en Alan Fest 21. Si cambias de planes, vuelve a confirmar desde la invitación.</p>';
  return {
    to: [{ email: s.email, name: s.name }],
    replyTo: { email: HOST_EMAIL, name: "Alan" },
    subject: s.attending ? "🎟️ Tu pulsera para Alan Fest 21" : "Alan Fest 21 — gracias por avisar",
    htmlContent: emailShell(inner),
  };
}

async function sendBrevo(payload: Record<string, unknown>) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ sender: { name: SENDER_NAME, email: SENDER_EMAIL }, ...payload }),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return json({ error: "origin" }, 403, origin);
  if (!BREVO_API_KEY) return json({ error: "not_configured" }, 503, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  // Honeypot: los humanos no ven este campo.
  if (body.website) return json({ ok: true }, 200, origin);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return json({ error: "rate_limited" }, 429, origin);

  const s = parse(body);
  if (typeof s === "string") return json({ error: "invalid", field: s }, 400, origin);

  const code = codeFrom(s.email + s.name);
  try {
    await Promise.all([sendBrevo(hostEmail(s, code)), sendBrevo(guestEmail(s, code))]);
  } catch (err) {
    console.error(err);
    return json({ error: "send_failed" }, 502, origin);
  }
  return json({ ok: true, code }, 200, origin);
});
