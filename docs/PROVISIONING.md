# Cihaz Provizyonu (Device Owner Kurulumu)

## Ön koşul: cihaz "temiz" olmalı

`dpm set-device-owner` **yalnızca üzerinde hiçbir Google/kullanıcı hesabı eklenmemiş** bir cihazda çalışır. Bu Android'in kasıtlı bir güvenlik kısıtıdır — sonradan uygulanamaz. Pratikte:

- Yeni/kutudan çıkmış bir tablet, veya
- Ayarlar > Sistem > Sıfırla > Fabrika ayarlarına sıfırla ile temizlenmiş bir cihaz kullanın.
- Kurulum sihirbazında **hiçbir hesap eklemeden** (Google hesabı dahil) "Atla" diyerek ilerleyin, USB hata ayıklamayı açın, sonra aşağıdaki adımlara geçin.

## Adımlar

1. Geliştirici seçeneklerini açın: Ayarlar > Telefon Hakkında > Yapı Numarası'na 7 kez dokunun.
2. Ayarlar > Geliştirici Seçenekleri > USB hata ayıklama'yı açın.
3. Cihazı USB ile bilgisayara bağlayın, `adb devices` ile cihazın göründüğünü doğrulayın.
4. APK'yı kurun (henüz Play Store'a yüklenmediği için `adb install`):
   ```
   adb install app-debug.apk
   ```
5. Uygulamayı device owner olarak atayın:
   ```
   adb shell dpm set-device-owner com.company.kiosk/.admin.KioskDeviceAdminReceiver
   ```
   Başarılı olursa `Success: Device owner set to package com.company.kiosk` mesajını görürsünüz.
6. Cihazı yeniden başlatın. Uygulama `BootReceiver` üzerinden otomatik açılıp kilitli kiosk ekranına düşmelidir.

## Pil optimizasyonunu kapatma (kritik — atlamayın)

Xiaomi (MIUI), Huawei (EMUI), Samsung (Device Care/Bakım), Oppo (ColorOS) gibi OEM Android sürümleri, `START_STICKY` ve foreground service'e rağmen arka plan servislerini agresif şekilde öldürebilir. Her cihaz modelinde şu adımları uygulayın:

- **Genel (AOSP)**: Ayarlar > Pil > Pil Optimizasyonu > KioskHub > "Optimize etme" seçin.
- **Xiaomi/MIUI**: Ayarlar > Uygulamalar > İzinler > Otomatik Başlatma'da uygulamayı açın; ayrıca "Diğer izinler"de arka plan çalışmasına izin verin.
- **Huawei/EMUI**: Telefon Yöneticisi > Uygulama Başlatma > uygulamayı bulup "Manuel Yönet" seçip Otomatik Başlatma/İkincil Başlatma/Arka Planda Çalıştırma'yı açın.
- **Samsung**: Ayarlar > Pil > Arka Planda Kullanım Sınırları > "Sınırlamalar olmadan" listesine ekleyin.

Bu ayarlar OEM'e göre değişir ve genel bir API ile otomatikleştirilemez; kurulum sırasında elle kontrol edilmelidir.

## Sınırlamalar

- Zaten kurulmuş/hesap eklenmiş bir cihazda device owner atanamaz — fabrika ayarlarına dönmek gerekir.
- MediaProjection tabanlı tam ekran görüntüsü (native-app-kiosk modu için) her process yeniden başlangıcında kullanıcı onay diyaloğu gerektirir; device owner ile bile sessizce verilemez. Bu yüzden v1'de sadece WebView içeriği (`PixelCopy`) yakalanır.
