// Chip link service: stores a Nuvio badge pack and serves it back at a short, stable address.
// One file, no dependencies. Needs a D1 database bound as DB (see README.md and schema.sql).

const MAX_BYTES = 1_500_000;            // D1 rows are limited to 2 MB
const ID_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const PER_HOUR = 30;                    // writes (create or update) per visitor per hour
const CREATES_PER_DAY = 25;             // new links per visitor per day
const ORIGINS = ['https://aljaz-h.github.io']; // sites allowed to create or edit links from a browser

const rand = (n, chars) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, v => chars[v % chars.length]).join(''); };
const sha = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');

function cors(req, open) {
  const o = req.headers.get('Origin') || '';
  const ok = ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return {
    'Access-Control-Allow-Origin': open ? '*' : (ok ? o : ORIGINS[0]),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Edit-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
const json = (req, data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req, false), ...extra } });
const fail = (req, status, error) => json(req, { error }, status);

function checkPack(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return 'that is not a badge pack';
  if (!Array.isArray(p.filters) || !p.filters.length) return 'the pack has no badges';
  if (p.filters.length > 600) return 'the pack has too many badges';
  if (p.groups !== undefined && !Array.isArray(p.groups)) return 'the pack groups are not a list';
  if (!p.filters.every(f => f && typeof f === 'object' && typeof f.id === 'string')) return 'a badge is missing its id';
  return '';
}
async function readPack(req) {
  if (+(req.headers.get('Content-Length') || 0) > MAX_BYTES) return { error: 'the pack is too large (limit about 1.5 MB)', status: 413 };
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) return { error: 'the pack is too large (limit about 1.5 MB)', status: 413 };
  let pack; try { pack = JSON.parse(text); } catch (e) { return { error: 'that is not valid JSON', status: 400 }; }
  const bad = checkPack(pack); if (bad) return { error: bad, status: 400 };
  return { body: JSON.stringify(pack) };
}

// returns true when this visitor is writing too often
async function limited(env, ip, creating) {
  const now = Math.floor(Date.now() / 1000);
  if (Math.random() < 0.02) await env.DB.prepare('DELETE FROM hits WHERE t < ?').bind(now - 90000).run();
  const h = await env.DB.prepare('SELECT COUNT(*) AS n FROM hits WHERE ip = ? AND t > ?').bind(ip, now - 3600).first();
  if (h.n >= PER_HOUR) return true;
  if (creating) {
    const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM hits WHERE ip = ? AND t > ? AND kind = 'c'").bind(ip, now - 86400).first();
    if (c.n >= CREATES_PER_DAY) return true;
  }
  await env.DB.prepare('INSERT INTO hits (ip, t, kind) VALUES (?, ?, ?)').bind(ip, now, creating ? 'c' : 'u').run();
  return false;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req, path.startsWith('/p/')) });

    if (path === '/') return new Response('Chip link service. Made for https://aljaz-h.github.io/chip/\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

    // GET /p/<id>  (what Nuvio downloads)
    let m = path.match(/^\/p\/([a-z0-9]{4,32})(?:\.json)?$/);
    if (m && (req.method === 'GET' || req.method === 'HEAD')) {
      const row = await env.DB.prepare('SELECT body FROM packs WHERE id = ?').bind(m[1]).first();
      if (!row) return new Response('Not found', { status: 404, headers: cors(req, true) });
      return new Response(req.method === 'HEAD' ? null : row.body, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', ...cors(req, true) } });
    }

    const ip = await sha((req.headers.get('CF-Connecting-IP') || 'unknown') + '|chip');

    // POST /api/packs  -> create
    if (path === '/api/packs' && req.method === 'POST') {
      if (await limited(env, ip, true)) return fail(req, 429, 'too many requests, try again later');
      const r = await readPack(req); if (r.error) return fail(req, r.status, r.error);
      const key = rand(24, ID_CHARS), keyHash = await sha(key), now = Math.floor(Date.now() / 1000);
      for (let i = 0; i < 6; i++) {
        const id = rand(8, ID_CHARS);
        try {
          await env.DB.prepare('INSERT INTO packs (id, key_hash, body, created, updated) VALUES (?, ?, ?, ?, ?)').bind(id, keyHash, r.body, now, now).run();
          return json(req, { id, key, url: `${url.origin}/p/${id}` }, 201);
        } catch (e) { if (!/UNIQUE|constraint/i.test(String(e && e.message))) throw e; }
      }
      return fail(req, 500, 'could not make a free link, try again');
    }

    // PUT/DELETE /api/packs/<id>  -> update or remove (needs the edit key)
    m = path.match(/^\/api\/packs\/([a-z0-9]{4,32})$/);
    if (m && (req.method === 'PUT' || req.method === 'DELETE')) {
      const key = req.headers.get('X-Edit-Key') || '';
      const row = await env.DB.prepare('SELECT key_hash FROM packs WHERE id = ?').bind(m[1]).first();
      if (!row) return fail(req, 404, 'that link does not exist any more');
      if (!key || (await sha(key)) !== row.key_hash) return fail(req, 403, 'wrong edit key for this link');
      if (req.method === 'DELETE') { await env.DB.prepare('DELETE FROM packs WHERE id = ?').bind(m[1]).run(); return json(req, { ok: true }); }
      if (await limited(env, ip, false)) return fail(req, 429, 'too many requests, try again later');
      const r = await readPack(req); if (r.error) return fail(req, r.status, r.error);
      await env.DB.prepare('UPDATE packs SET body = ?, updated = ? WHERE id = ?').bind(r.body, Math.floor(Date.now() / 1000), m[1]).run();
      return json(req, { id: m[1], url: `${url.origin}/p/${m[1]}` });
    }

    return fail(req, 404, 'not found');
  },
};
