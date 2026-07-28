# Backend API

Base URL: `http://<server-host>:3000`

## Enrollment (auth yok — cihazın henüz token'ı yok)

| Method | Path | Açıklama |
|---|---|---|
| POST | `/api/enroll` | `{ code }` — admin'in ürettiği 6 haneli kısa kodu gerçek `deviceToken`'a çevirir. `{ deviceId, deviceToken }` döner. Kod tek kullanımlık ve ~15 dakika geçerlidir. |

## Cihaz uç noktaları (Authorization: Bearer &lt;deviceToken&gt;)

| Method | Path | Açıklama |
|---|---|---|
| POST | `/api/devices/:id/heartbeat` | Pil, IP, güncel URL/app, uptime bildirir. `{ profileVersion, hasNewProfile }` döner. |
| GET | `/api/devices/:id/profile` | Cihazın etkin ayar profilini (`configJson`) döner. |
| GET | `/api/devices/:id/commands/pending` | Bekleyen komutları listeler. |
| POST | `/api/devices/:id/commands/:commandId/ack` | Komutun sonucunu bildirir (`{ status: "ACKED"|"FAILED", result? }`). |
| POST | `/api/devices/:id/screenshot` | `multipart/form-data`, `screenshot` alanında JPEG dosyası. |

## Admin uç noktaları (session auth, önce `/api/auth/login`)

| Method | Path | Açıklama |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → session cookie. |
| POST | `/api/auth/logout` | Oturumu kapatır. |
| GET | `/api/auth/me` | Oturum sahibini döner. |
| GET/POST | `/api/admin/devices` | Cihaz listele / oluştur. Oluşturma yanıtı bir `enrollmentCode` (6 karakter, ~15 dk geçerli) döner — TV'de ayarlar ekranına bu kod + sunucu URL'si girilir. |
| PUT/DELETE | `/api/admin/devices/:id` | Cihaz güncelle / sil. |
| POST | `/api/admin/devices/:id/enrollment-code` | Cihaz için taze bir kayıt kodu üretir (önceki kod süresi dolmuşsa veya cihaz sıfırlanıp yeniden kaydolması gerekiyorsa). |
| POST | `/api/admin/devices/:id/commands` | Cihaza komut kuyruğa ekle. |
| GET | `/api/admin/devices/:id/heartbeats?limit=` | Heartbeat geçmişi. |
| GET | `/api/admin/devices/:id/screenshots/latest` | Son ekran görüntüsü kaydı. |
| GET | `/api/admin/screenshot-files/:filename` | Ekran görüntüsü dosyasını indirir. |
| GET/POST | `/api/admin/groups` | Grup listele / oluştur. |
| PUT/DELETE | `/api/admin/groups/:id` | Grup güncelle / sil. |
| POST | `/api/admin/groups/:id/commands` | Gruptaki tüm cihazlara komut fan-out eder. |
| GET/POST | `/api/admin/profiles` | Ayar profili listele / oluştur (`config` alanı `docs/settings-profile-schema.json`'a uymalı). |
| PUT/DELETE | `/api/admin/profiles/:id` | Profil güncelle (günceleme `version`'ı artırır) / sil. |

## Komut tipleri

`RELOAD`, `LOCK`, `UNLOCK`, `REBOOT`, `RESTART_APP`, `REQUEST_SCREENSHOT`, `APPLY_PROFILE`, `SET_URL` (payload: `{ url }` — tam profil gerektirmeden sadece cihazın URL'sini değiştirir)
