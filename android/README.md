# Android Kiosk App

Kotlin/Gradle projesi. Device Owner + Lock Task Mode ile tam kilitli WebView kiosk modu, arka planda backend ile heartbeat/komut/profil senkronizasyonu.

## Derleme

```bash
./gradlew assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`

`local.properties` içinde `sdk.dir` kendi Android SDK yolunuza işaret etmeli (Android Studio bunu otomatik oluşturur).

## Kurulum ve Device Owner Provizyonu

Bkz. [../docs/PROVISIONING.md](../docs/PROVISIONING.md) — `adb shell dpm set-device-owner` adımları ve OEM pil optimizasyonu notları.

## Backend'e Bağlama (Enrollment)

Uzun UUID/token yerine kısa (6 karakter), tek kullanımlık bir kayıt kodu ile çalışır — TV kumandasıyla yazması kolay olsun diye:

1. Admin dashboard'da (`http://<sunucu>:3000`) **Devices** sayfasından cihazı oluşturun (veya var olan bir cihaz için **"Get enrollment code"**'a basın) — büyük fontla 6 haneli bir kod gösterilir (~15 dk geçerli).
2. Cihazda kiosk ekranında sağ üst köşeye 2 saniye içinde 5 kez dokunun (dokunmatik ekran) **veya** kumandada OK/Enter/Geri tuşuna ~1 saniye basılı tutun (TV), varsayılan PIN (`1234`) ile ayarlara girin.
3. **Backend enrollment** bölümüne `Server base URL`'i (örn. `http://192.168.1.10:3000`) ve dashboard'da gösterilen **6 haneli kodu** girip **Enroll**'a basın — cihaz kodu gerçek token ile değiştirir, bunu bir daha elle girmenize gerek kalmaz.
4. Kiosk ekranına dönün — 20 saniyede bir heartbeat göndermeye, bekleyen komutları çekmeye ve profil güncellemelerini uygulamaya başlar (bkz. `kiosk/KioskActivity.runSyncLoop`). Dashboard'da cihazın "Online" göründüğünü doğrulayın.

Kod süresi dolduysa veya cihaz fabrika ayarlarına döndüyse, dashboard'dan aynı cihaz için tekrar **"Get enrollment code"**'a basıp yeni bir kodla 2-3. adımları tekrarlayın (eski token geçersiz kılınıp yenisiyle değiştirilir).

Backend adresi düz HTTP olduğu için (`network_security_config.xml` ile cleartext trafiğe izin verilmiştir — bkz. dosyadaki not), sunucuyu şirket içi ağ dışına açmayın.

## Paket Yapısı

- `admin/` — `KioskDeviceAdminReceiver`, `ProvisioningManager` (Device Owner sertleştirme: `setLockTaskPackages`, `setStatusBarDisabled`, `setKeyguardDisabled`)
- `kiosk/` — `KioskActivity` (WebView kiosk ekranı, gizli 5-dokunuş + PIN çıkışı, backend sync döngüsü, PixelCopy screenshot), `SettingsActivity` (yerel ayar + enrollment editörü), `UrlMatcher` (whitelist/blacklist)
- `watchdog/` — `BootReceiver`, `KioskForegroundService` (otomatik başlatma, `START_STICKY`)
- `data/` — `SettingsProfileConfig` (bkz. [../docs/settings-profile-schema.json](../docs/settings-profile-schema.json)), `SettingsRepository` (DataStore), `PinManager` (salted PIN hash), `DeviceCredentials`/`DeviceCredentialsRepository` (sunucu URL/cihaz ID/token)
- `network/` — `KioskApiClient` (OkHttp + org.json; heartbeat, profil çekme, komut poll/ack, screenshot yükleme), `EnrollmentClient.enrollWithCode` (kısa kod → token değişimi — bkz. [../docs/API.md](../docs/API.md))

## Varsayılan Ayarlar

İlk açılışta: URL `https://www.example.com`, PIN `1234` (rastgele salt ile hash'lenip DataStore'a kaydedilir), backend enrollment boş (sync döngüsü otomatik olarak devre dışı kalır ve sadece yerel modda çalışır).

## Desteklenen Uzaktan Komutlar

`RELOAD`, `LOCK`, `UNLOCK`, `RESTART_APP`, `REBOOT`, `REQUEST_SCREENSHOT` (WebView içeriğini `PixelCopy` ile yakalayıp yükler), `APPLY_PROFILE`, `SET_URL` (payload: `{url}`, tam profil gerektirmeden hızlı URL değişimi). `LOCK` ve `REBOOT`, cihaz Device Owner değilse anlamlı bir hata mesajıyla `FAILED` döner (bkz. [../docs/PROVISIONING.md](../docs/PROVISIONING.md)).

## Henüz Yapılmadı

Zamanlanmış uyku/uyanma, idle screensaver, hareket algılama (accelerometer/kamera), tam ekran MediaProjection screenshot (native-app-kiosk için), native-app-kiosk modu, arka planda (kiosk ekranı kapalıyken) da devam eden heartbeat için WorkManager tabanlı watchdog sertleştirmesi — bkz. kök [README.md](../README.md) geliştirme durumu.
