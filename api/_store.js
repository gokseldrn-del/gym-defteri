// Upstash Redis (Vercel Marketplace) REST istemcisi — bağımlılık yok.
// Vercel, Upstash entegrasyonunu bağlayınca KV_REST_API_URL / KV_REST_API_TOKEN
// (veya UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) değişkenlerini ekler.

// Bağlarken farklı bir önek (prefix) seçilmiş olabilir: *_REST_API_URL / *_REST_API_TOKEN çiftini bul.
function findEnv() {
  const env = process.env;
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return [env.KV_REST_API_URL, env.KV_REST_API_TOKEN];
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN];
  for (const k of Object.keys(env)) {
    if (k.endsWith("_REST_API_URL")) {
      const t = env[k.replace(/_URL$/, "_TOKEN")];
      if (t) return [env[k], t];
    }
  }
  return [undefined, undefined];
}
const [URL_, TOKEN] = findEnv();

export const COLLECTIONS = ["logs", "measurements"];

export function storeReady() {
  return Boolean(URL_ && TOKEN);
}

export async function redis(command) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `Redis ${r.status}`);
  return j.result;
}

export async function readAll(collection) {
  const flat = (await redis(["HGETALL", `gym:${collection}`])) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { out.push({ id: flat[i], ...JSON.parse(flat[i + 1]) }); } catch { /* bozuk kayıt atlanır */ }
  }
  return out.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
}

// Şifre: APP_PASSWORD ortam değişkeni. Header (x-app-key) veya ?key= ile gelir.
export function authorized(req) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return false;
  const given = req.headers["x-app-key"] || (req.query && req.query.key);
  return given === pass;
}

export function fail(res, code, message) {
  res.status(code).json({ error: message });
}
