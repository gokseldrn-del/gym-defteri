import { COLLECTIONS, storeReady, redis, readAll, authorized, fail } from "./_store.js";

const ID_RE = /^[A-Za-z0-9_.:-]{1,120}$/;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.APP_PASSWORD) return fail(res, 500, "APP_PASSWORD ayarlanmamış. Vercel > Settings > Environment Variables.");
  if (!storeReady()) return fail(res, 500, "Veritabanı bağlı değil. Vercel > Storage > Upstash Redis ekleyip projeye bağla.");
  if (!authorized(req)) return fail(res, 401, "Şifre yanlış.");

  try {
    if (req.method === "GET") {
      const c = req.query.c;
      if (c) {
        if (!COLLECTIONS.includes(c)) return fail(res, 400, "Bilinmeyen koleksiyon.");
        return res.status(200).json({ [c]: await readAll(c) });
      }
      // ?c yoksa hepsi (Claude'un okuması için de bu kullanılır)
      const all = {};
      for (const col of COLLECTIONS) all[col] = await readAll(col);
      return res.status(200).json(all);
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { c, id, doc } = body;
      if (!COLLECTIONS.includes(c)) return fail(res, 400, "Bilinmeyen koleksiyon.");
      if (!ID_RE.test(String(id || ""))) return fail(res, 400, "Geçersiz kayıt kimliği.");
      if (!doc || typeof doc !== "object") return fail(res, 400, "Kayıt boş.");
      const json = JSON.stringify(doc);
      if (json.length > 20000) return fail(res, 400, "Kayıt çok büyük.");
      await redis(["HSET", `gym:${c}`, id, json]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { c, id } = req.query;
      if (!COLLECTIONS.includes(c) || !ID_RE.test(String(id || ""))) return fail(res, 400, "Geçersiz istek.");
      await redis(["HDEL", `gym:${c}`, id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return fail(res, 405, "Desteklenmeyen istek.");
  } catch (e) {
    return fail(res, 500, "Sunucu hatası: " + e.message);
  }
}
