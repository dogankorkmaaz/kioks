# Admin Dashboard

React + Vite + TypeScript SPA. Backend'in `/api/admin/*` ve `/api/auth/*` uç noktalarını kullanır.

## Geliştirme

```bash
npm install
npm run dev
```

`http://localhost:5173` açılır; `/api` istekleri `vite.config.ts`'deki proxy ayarıyla otomatik olarak `http://localhost:3000`'e yönlendirilir (aynı origin gibi davranır, cookie sorunu olmaz).

## Production

```bash
npm run build
```

Çıktı `dist/`'e yazılır. Backend (`../backend/src/app.ts`) bu dizini otomatik olarak statik dosya olarak servis eder ve API dışındaki tüm rotalarda `index.html`'e düşer (React Router client-side routing için).

## Sayfalar

- **Login** — admin oturum açma
- **Devices** — cihaz listesi (durum/pil/URL/grup/profil), yeni cihaz ekleme (token bir kez gösterilir), cihaz detay sayfasına link
- **Device detail** — komut gönderme (Reload/Lock/Unlock/Restart/Reboot/Screenshot iste/Profili yeniden uygula), heartbeat geçmişi, son ekran görüntüsü önizlemesi
- **Groups** — grup CRUD, gruptaki tüm cihazlara toplu komut
- **Profiles** — ayar profili CRUD, `configJson`'ı doğrudan JSON olarak düzenleme (bkz. [../docs/settings-profile-schema.json](../docs/settings-profile-schema.json))

## Not

`react-router-dom`'un güncel sürümünde (7.18.1) yalnızca deneysel "RSC mode" ile ilgili bir CVE (`GHSA-qwww-vcr4-c8h2`) `npm audit` tarafından işaretleniyor. Bu SPA React Server Components/RSC mode kullanmadığından (saf client-side render) risk bu proje için geçerli değil; daha eski sürümlere düşmek farklı (SSR/prerender ile ilgili) ve daha geniş kapsamlı zafiyetlere yol açtığı için en güncel sürümde kalınmıştır.
