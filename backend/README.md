# Backend

Node.js + Express + Prisma + PostgreSQL. Cihaz kaydı, ayar profilleri, komut kuyruğu ve admin API.

## Kurulum

```bash
npm install
cp .env.example .env   # DATABASE_URL ve SESSION_SECRET'i kendi ortamınıza göre düzenleyin
npx prisma migrate dev
npm run prisma:seed    # SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env değişkenleriyle özelleştirilebilir
npm run dev
```

`GET http://localhost:3000/health` → `{"status":"ok"}` dönmeli.

## Komutlar

- `npm run dev` — tsx ile hot-reload geliştirme sunucusu
- `npm run build` / `npm start` — production derleme + çalıştırma
- `npm test` — vitest ile birim testleri
- `npm run prisma:studio` — veritabanını tarayıcıda incelemek için Prisma Studio

## API

Bkz. [../docs/API.md](../docs/API.md).

## Notlar

- Cihaz token'ları yalnızca oluşturma anında (`POST /api/admin/devices` yanıtında) düz metin olarak döner; sunucu sadece hash'ini saklar.
- Ekran görüntüleri `uploads/screenshots/` altında dosya olarak, veritabanında sadece yol bilgisiyle tutulur.
