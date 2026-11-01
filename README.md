# Gym Defteri

Kişisel antrenman defteri: program, set/tekrar kaydı, dinlenme sayacı, kas haritası, ilerleme grafikleri ve vücut ölçümleri.

- `index.html`: uygulamanın tamamı (tek sayfa, telefon öncelikli, "Ana Ekrana Ekle" ile uygulama gibi açılır)
- `api/data.js`: kayıtları okuyup yazan Vercel fonksiyonu
- Veritabanı: Upstash Redis (Vercel Marketplace, ücretsiz katman)

## Vercel kurulumu

1. Vercel → **Add New → Project** → bu repoyu seç → **Deploy** (ayar değiştirme).
2. Proje → **Storage** → **Upstash (Redis)** → oluştur → bu projeye **Connect**.
3. Proje → **Settings → Environment Variables** → `APP_PASSWORD` = kendi şifren.
4. **Deployments** → son deploy → **Redeploy**.
5. Siteyi Safari'de aç → şifreyi gir → Paylaş → **Ana Ekrana Ekle**.

## Veri

`GET /api/data?key=<APP_PASSWORD>` → `{ logs: [...], measurements: [...] }`

- `logs`: id `YYYY-MM-DD_<hareketId>`; `date, dayKey, exName, target, sets[{kg, reps}]`
- `measurements`: id = tarih; `weight, waist`
