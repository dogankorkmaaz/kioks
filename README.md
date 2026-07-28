# KioskHub — Şirket İçi Kiosk Uygulaması + Uzaktan Yönetim

"Fully Kiosk Browser & Lockdown" benzeri, şirket içi kullanım için geliştirilen Android kiosk uygulaması ve çoklu cihaz yönetim backend'i.

## Bileşenler

- **`android/`** — Kotlin/Gradle Android uygulaması. Device Owner + Lock Task Mode ile tam kilitli WebView kiosk modu, DataStore tabanlı ayarlanabilir profil. Bkz. [android/README.md](android/README.md).
- **`backend/`** — Node.js + Express + Prisma + PostgreSQL. Cihaz kaydı, ayar profilleri, uzaktan komut kuyruğu, admin API. Bkz. [backend/README.md](backend/README.md).
- **`dashboard/`** — React + Vite admin paneli (backend tarafından statik olarak servis edilir). Bkz. [dashboard/README.md](dashboard/README.md).
- **`docs/`** — [PROVISIONING.md](docs/PROVISIONING.md) (Device Owner kurulum adımları), [API.md](docs/API.md) (uç nokta referansı), [settings-profile-schema.json](docs/settings-profile-schema.json) (ayar profili şemasının tek kaynağı).

## Geliştirme Durumu

Aşamalı kilometre taşları (Faz 0-9):

- ✅ Faz 0: Android + backend iskeleti
- ✅ Faz 1: Device Owner, Lock Task, WebView kiosk, PIN çıkışı, boot watchdog — gerçek cihazda derlenip test edildi (`assembleDebug` başarılı)
- ✅ Faz 2: DataStore tabanlı yerel ayar profili (URL, JS/zoom/popup/autoplay/çerez, whitelist/blacklist, salted PIN hash)
- ✅ Faz 3-4: Backend enrollment, heartbeat, komut kuyruğu — uçtan uca `curl` ile doğrulandı
- ✅ Faz 5: React admin dashboard (login, cihaz listesi, komut gönderme, grup/profil yönetimi, screenshot önizleme) — tarayıcıda uçtan uca doğrulandı
- ✅ Android ↔ backend bağlantısı: `KioskActivity` artık 20 saniyede bir heartbeat gönderiyor, profil güncellemelerini çekiyor, bekleyen komutları (RELOAD/LOCK/UNLOCK/RESTART_APP/REBOOT/REQUEST_SCREENSHOT/APPLY_PROFILE/SET_URL) çalıştırıp ack'liyor
- ✅ Kısa kayıt kodu (enrollment code) akışı: TV kumandasıyla uzun UUID/token yazmak yerine dashboard'da üretilen 6 haneli tek kullanımlık kodla kayıt
- ✅ Gerçek bir Android TV cihazında uçtan uca doğrulandı: Device Owner kurulumu, kayıt, heartbeat/online durumu, LOCK (gerçekten kilitleniyor — `mLockTaskModeState=LOCKED`), screenshot, dashboard'dan profil/grup atama ve hızlı URL değiştirme
- ✅ **Production dağıtımı**: Backend + dashboard artık şirket içi bir Raspberry Pi'de (Ubuntu 24.04) pm2 ile kalıcı olarak çalışıyor — reboot sonrası otomatik başlıyor (`pm2-dk.service` + PostgreSQL sistemd servisi ikisi de `enabled`). Geliştirme sırasında Windows'ta çalıştırılan geçici sunucu kapatıldı.
- ⏳ Faz 6-9: watchdog sertleştirme, zamanlama/screensaver/hareket algılama, native-app-kiosk modu, cila — sırada

## Production Sunucusu

- **Adres:** `http://<sunucu-ip>:3000` (şirket içi ağdaki Raspberry Pi'nin IP adresi — güvenlik nedeniyle burada paylaşılmıyor)
- **Konum:** `/home/dk/kioskhub` (şirket içi ağdaki bir Raspberry Pi)
- **Süreç yönetimi:** `pm2` (`pm2 list`, `pm2 logs kioskhub-backend`, `pm2 restart kioskhub-backend`)
- **Veritabanı:** Yerel PostgreSQL (`kioskhub` db, `kiosk` kullanıcısı) — bu sunucu Windows'taki geliştirme veritabanından bağımsız, sıfırdan kuruldu; TV'yi yeni bir enrollment koduyla bu sunucuya kaydetmeniz gerekir (bkz. [android/README.md](android/README.md#backende-bağlama-enrollment)).
- **Güncelleme:** Kod değişince `backend/` ve `dashboard/`'ı Pi'ye kopyalayıp (`scp`/`rsync`), `npm install && npm run build` (her ikisinde) ve `pm2 restart kioskhub-backend` çalıştırın.

## Hızlı Başlangıç

Backend + dashboard:
```bash
cd backend
npm install
cp .env.example .env   # DATABASE_URL ve SESSION_SECRET'i düzenleyin
npx prisma migrate dev
npm run prisma:seed    # ilk admin kullanıcısını oluşturur
npm run dev             # http://localhost:3000

# ayrı bir terminalde, dashboard'ı derleyip backend'in servis etmesini sağlamak için:
cd ../dashboard
npm install
npm run build           # backend otomatik olarak dashboard/dist'i http://localhost:3000 üzerinden servis eder
```

Dashboard geliştirme sırasında canlı yenileme için `cd dashboard && npm run dev` (http://localhost:5173, `/api` istekleri otomatik olarak backend'e proxy'lenir).

Android: `android/` dizinini Android Studio ile açın (veya `./gradlew assembleDebug`), ardından [docs/PROVISIONING.md](docs/PROVISIONING.md)'deki adb adımlarını izleyin.
