// Alan Fest 21 — Playlist: busca canciones y las agrega a la playlist.
// Secretos (Supabase > Edge Functions > Secrets):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN

const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET") ?? "";
const REFRESH_TOKEN = Deno.env.get("SPOTIFY_REFRESH_TOKEN") ?? "";
const PLAYLIST_ID = Deno.env.get("SPOTIFY_PLAYLIST_ID") ?? "6LdZAYWJHKMR4T0cm3PbGl";
const MARKET = "MX";

const ALLOWED_ORIGINS = [
  "https://alexis4021.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

// Límite básico de canciones agregadas por IP (se reinicia si la función se recicla).
const ADD_LIMIT = 15;
const ADD_WINDOW_MS = 60 * 60 * 1000;
const adds = new Map<string, number[]>();

let token = "";
let tokenExp = 0;

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
  const list = (adds.get(ip) ?? []).filter((t) => now - t < ADD_WINDOW_MS);
  list.push(now);
  adds.set(ip, list);
  return list.length > ADD_LIMIT;
}

async function getToken() {
  if (token && Date.now() < tokenExp) return token;
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": "Basic " + btoa(CLIENT_ID + ":" + CLIENT_SECRET),
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: REFRESH_TOKEN }),
  });
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`);
  const data = await r.json();
  token = data.access_token;
  tokenExp = Date.now() + (data.expires_in - 60) * 1000;
  return token;
}

async function spotify(path: string, init: RequestInit = {}) {
  const t = await getToken();
  const r = await fetch("https://api.spotify.com/v1" + path, {
    ...init,
    headers: { "Authorization": "Bearer " + t, ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`api ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

async function search(q: string) {
  const data = await spotify(`/search?type=track&limit=8&market=${MARKET}&q=${encodeURIComponent(q)}`);
  // deno-lint-ignore no-explicit-any
  return ((data?.tracks?.items ?? []) as any[]).map((t) => {
    const imgs = t.album?.images ?? [];
    return {
      uri: t.uri,
      name: t.name,
      // deno-lint-ignore no-explicit-any
      artists: (t.artists ?? []).map((a: any) => a.name).join(", "),
      image: imgs.length ? imgs[imgs.length - 1].url : "",
    };
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return json({ error: "origin" }, 403, origin);
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) return json({ error: "not_configured" }, 503, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  try {
    if (body.action === "search") {
      const q = String(body.q ?? "").trim().slice(0, 100);
      if (q.length < 2) return json({ error: "invalid" }, 400, origin);
      return json({ tracks: await search(q) }, 200, origin);
    }

    if (body.action === "add") {
      const uri = String(body.uri ?? "");
      if (!/^spotify:track:[A-Za-z0-9]{22}$/.test(uri)) return json({ error: "invalid" }, 400, origin);
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
      if (rateLimited(ip)) return json({ error: "rate_limited" }, 429, origin);
      await spotify(`/playlists/${PLAYLIST_ID}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: [uri] }),
      });
      return json({ ok: true }, 200, origin);
    }

    return json({ error: "action" }, 400, origin);
  } catch (err) {
    console.error(err);
    return json({ error: "spotify_failed" }, 502, origin);
  }
});
