# SO7LE — Admin Panel Kullanıcı Kılavuzu

> Bu kılavuz, admin panelini kullanan yönetici ve moderatörlere yöneliktir.  
> Panele erişmek için giriş yapmış ve gerekli yetkiye sahip olmanız gerekir.

---

## İçindekiler

1. [Panele Giriş](#1-panele-giriş)
2. [Genel Bakış ve Canlı Radar](#2-genel-bakış-ve-canlı-radar)
3. [Sorun Yönetimi](#3-sorun-yönetimi)
4. [Çözüm Yönetimi](#4-çözüm-yönetimi)
5. [Uzman Onayları](#5-uzman-onayları)
6. [Kategoriler](#6-kategoriler)
7. [Kullanıcı Yönetimi](#7-kullanıcı-yönetimi)
8. [Kurumlar](#8-kurumlar)
9. [Şikayet Merkezi](#9-şikayet-merkezi)
10. [Geri Bildirimler](#10-geri-bildirimler)
11. [Sohbet Yönetimi](#11-sohbet-yönetimi)
12. [Güvenlik İzleme](#12-güvenlik-izleme)
13. [Duyurular](#13-duyurular)
14. [Loglar ve Geçmiş](#14-loglar-ve-geçmiş)
15. [Kill Switch](#15-kill-switch)
16. [Sözleşmeler](#16-sözleşmeler)
17. [E-posta Şablonları](#17-e-posta-şablonları)
18. [Hakkımızda İçeriği](#18-hakkımızda-i̇çeriği)
19. [Modül Yönetimi](#19-modül-yönetimi)
20. [Workflow Builder](#20-workflow-builder)
21. [Yetki Yönetimi](#21-yetki-yönetimi)
22. [Yetki Şablonları](#22-yetki-şablonları)
23. [Yetki Logları](#23-yetki-logları)
24. [Metrikler](#24-metrikler)

---

## 1. Panele Giriş

Tarayıcınızda `/admin` adresine gidin. Giriş yapmamışsanız otomatik olarak giriş sayfasına yönlendirilirsiniz.

Giriş yaptıktan sonra sol tarafta bir kenar çubuğu (sidebar) görürsünüz. Bu çubuk, erişim izninize göre kişiselleştirilmiştir — görmediğiniz menü öğeleri için yetkiniz yok demektir.

**Mobilde kullanım:** Ekranın sol üst köşesindeki ☰ simgesine dokunarak menüyü açabilirsiniz. Bir sayfaya geçtikten sonra menü otomatik kapanır.

---

## 2. Genel Bakış ve Canlı Radar

### Genel Bakış

Panele girdiğinizde ilk açılan sayfa **Genel Bakış**'tır. Platformun anlık özetini sunar:

- Toplam kullanıcı, sorun, çözüm sayıları
- Bekleyen şikayet ve uzman onayı sayıları
- Banlı kullanıcı sayısı
- Aktif iş akışı sayısı
- Sistem çalışma süresi ve başarı oranları

Sayfanın alt bölümünde son eklenen sorunlar ve grafik görünümler yer alır.

### Canlı Radar

Sol menüden **Canlı Radar**'a tıkladığınızda sunucunun anlık sağlık durumunu izleyebilirsiniz: işlemci ve bellek kullanımı, veritabanı bağlantı durumu ve servis erişilebilirliği.

---

## 3. Sorun Yönetimi

Sol menüden **Sorunlar**'a tıklayın.

### Sorunları Listeleme ve Filtreleme

Sayfada tüm sorunların listesi görüntülenir. Üst kısımdaki arama ve filtre araçlarını kullanabilirsiniz:

- **Metin arama:** Sorun başlığına göre arama
- **Durum:** Öne çıkarılmış veya çözülmüş sorunları filtreleyin
- **Kurum:** Belirli bir kuruma ait sorunları görün
- **Kategori:** Belirli bir kategoriye göre filtreleyin

### Sorun İşlemleri

Her sorunun yanındaki menü ikonuna tıklayarak şu işlemleri yapabilirsiniz:

| İşlem | Ne yapar? |
|-------|-----------|
| **Çözüldü işaretle** | Sorunun çözüme kavuştuğunu işaretler; tekrar tıklayınca geri alınır |
| **Öne çıkar** | Sorun ana sayfada öne çıkarılır; tekrar tıklayınca kaldırılır |
| **Kapat** | Sorun bir gerekçe yazılarak kapatılır; kullanıcılar yeni çözüm ekleyemez |
| **Yeniden aç** | Kapatılmış bir sorun tekrar aktif hâle getirilir |
| **Gizle** | Sorun diğer kullanıcılardan gizlenir |
| **Sil** | Sorun kalıcı olarak silinir — bu işlem geri alınamaz |

---

## 4. Çözüm Yönetimi

Sol menüden **Çözümler**'e tıklayın.

Platform genelindeki çözümleri görüntüleyip yönetebilirsiniz.

| İşlem | Ne yapar? |
|-------|-----------|
| **Öne çıkar** | Çözüm ilgili sorunun üstünde vurgulanır |
| **Onayla** | Uzman onayı bekleyen çözümü kabul eder |
| **Reddet** | Uzman onayı bekleyen çözümü reddeder |
| **Sil** | Çözümü kalıcı olarak kaldırır |

---

## 5. Uzman Onayları

Sol menüden **Uzman Onayları**'na tıklayın.

Uzmanlar tarafından öne çıkarılmak üzere işaretlenmiş çözümler burada inceleme kuyruğunda bekler.

**İnceleme adımları:**
1. Listeden bir çözüme tıklayın ve içeriği okuyun
2. Onaylamak için **Onayla**, reddetmek için **Reddet** butonunu kullanın
3. Onaylanan çözümler platformda uzman rozeti ile gösterilir

---

## 6. Kategoriler

Sol menüden **Kategoriler**'e tıklayın.

Sorunların sınıflandırıldığı kategori (konu) ağacını yönetirsiniz.

**Yapabilecekleriniz:**
- Yeni kategori oluşturma (ad, ikon, görsel)
- Mevcut kategoriyi düzenleme
- Kategori sırasını değiştirme
- Kullanılmayan kategoriyi silme

---

## 7. Kullanıcı Yönetimi

Sol menüden **Kullanıcılar**'a tıklayın. Bu sayfa, platformun en kapsamlı yönetim araçlarından birini sunar.

### Kullanıcı Arama

Sayfanın üstündeki arama kutusuna ad, soyad veya e-posta yazın. Gelişmiş filtreler:

- **Banlı:** Yalnızca banlı kullanıcıları göster
- **E-posta doğrulanmamış:** Doğrulama bekleyenler
- **Şikayet edilmiş:** Hakkında şikayet gelen kullanıcılar
- **Kayıt tarihi:** Son 7 gün / Son 30 gün
- **Kurum:** Belirli kuruma ait kullanıcılar

### Kullanıcı İşlemleri

Her kullanıcının yanındaki menü simgesine tıklayarak işlem yapabilirsiniz:

---

#### Banlama / Ban Kaldırma

Kullanıcı platforma erişimden engellenir. Banlı kullanıcı giriş yapamaz, içerik oluşturamaz. Ban kaldırmak için aynı menüden **Banı Kaldır**'a tıklayın.

---

#### Uyarı Verme

Kullanıcıya resmi bir uyarı göndermek için **Uyarı Ver**'i seçin. Açılan formda şunları doldurun:

- **Başlık:** Kısa bir konu (ör. "Uygunsuz İçerik")
- **Mesaj:** Kullanıcıya iletilecek açıklama
- **Önem derecesi:** Düşük / Orta / Yüksek / Kritik

Geçmiş uyarıları görmek için **Uyarı Geçmişi**'ne tıklayın. Hatalı verilen uyarıyı bu listeden geri alabilirsiniz.

---

#### Kimliğe Bürünme

Bir kullanıcının gözünden platformu görmek için kullanılır. **Kimliğe Bürün**'e tıklayınca admin şifrenizi girmeniz istenir. Doğrulama sonrası o kullanıcının hesabıyla oturum açılır. Oturumu kapatarak kendi hesabınıza dönebilirsiniz.

> Bu özellik yalnızca sorun giderme ve test amaçlıdır.

---

#### Kurum Değiştirme

Kullanıcının bağlı olduğu kurumu değiştirmek için **Kurum Değiştir**'e tıklayın ve açılan listeden yeni kurumu seçin.

---

#### Unvan Atama

Kullanıcıya özel bir unvan ekleyebilirsiniz (ör. "Güvenilir Uzman", "Onursal Üye"). **Unvan Yönet**'e tıklayın:

- Mevcut unvanları listeleyin ve kaldırın
- Yeni unvan ekleyin: ad, tür (resmi / uzman / özel), renk, ikon

Unvanlar kullanıcının profil sayfasında görüntülenir.

---

#### Yetki Paketi Uygulama

Önceden hazırlanmış yetki paketlerini (şablonları) kullanıcıya tek tıklamayla uygulayabilirsiniz. **Yetki Paketi**'ne tıklayın, uygulamak istediğiniz paketi seçin ve onaylayın.

---

## 8. Kurumlar

Sol menüden **Kurumlar**'a tıklayın.

Platformdaki tüm kurumları görüntüler ve yönetirsiniz.

**Yapabilecekleriniz:**
- Yeni kurum ekleme (ad, alan adı, alt alan adı, logo, renk)
- Kurum bilgilerini güncelleme
- Kuruma ait kullanıcıları listeleme

---

## 9. Şikayet Merkezi

Sol menüden **Şikayet Merkezi**'ne tıklayın. Sayfanın üstündeki rozet, bekleyen şikayet sayısını gösterir.

Şikayetler üç sekmeye ayrılmıştır: **Sorun Şikayetleri**, **Çözüm Şikayetleri**, **Kullanıcı Şikayetleri**.

### Şikayet İnceleme

Her satırda şu bilgiler yer alır:
- Şikayet edilen içerik
- Şikayet nedeni
- Şikayeti gönderen kullanıcı
- Şikayet tarihi

### Şikayet İşlemleri

| İşlem | Ne yapar? |
|-------|-----------|
| **Şikayeti Çöz** | Şikayeti kapatır, içerik yerinde kalır |
| **İçeriği Sil + Çöz** | İçeriği siler ve şikayeti aynı anda kapatır |
| **Kullanıcıyı Banla** | Kullanıcı şikayetlerinde, hesabı doğrudan engeller |

Birden fazla şikayeti aynı anda kapatmak için satırların solundaki onay kutularını işaretleyin ve **Seçilenleri Çöz**'e tıklayın.

---

## 10. Geri Bildirimler

Sol menüden **Gelen Kutusu**'na tıklayın. Sayfanın üstündeki rozet okunmamış sayısını gösterir.

Kullanıcıların gönderdiği geri bildirim mesajlarını buradan okuyabilir, yanıtlayabilir veya silebilirsiniz.

---

## 11. Sohbet Yönetimi

Sol menüden **Sohbet**'e tıklayın.

Platform içi sohbet sisteminin aktif olup olmadığını görür ve grup konuşmaları yönetirsiniz.

**Yapabilecekleriniz:**
- Yeni grup konuşması oluşturma
- Mevcut konuşmaları listeleme ve silme
- Mesajları moderasyon amacıyla görüntüleme ve silme

> Sohbet sistemi kapalıysa bu sayfada bilgilendirme mesajı görünür. Açmak için **Modül Yönetimi** sayfasından ilgili ayarı etkinleştirin.

---

## 12. Güvenlik İzleme

Sol menüden **Güvenlik İzleme**'ye tıklayın.

Platform üzerindeki şüpheli aktiviteleri gerçek zamanlı takip edersiniz.

### Olay Türleri

| Tür | Açıklama |
|-----|----------|
| Başarısız giriş | Hatalı şifre denemeleri |
| Rate limit aşımı | Çok fazla istek gönderen kullanıcılar |
| Yetkisiz erişim girişimi | Yetkisi olmadığı sayfaya erişmeye çalışanlar |
| API tarama | Otomatik araçlarla sistemi tararken yakalananlar |

### Filtreleme

Olayları şuna göre filtreleyebilirsiniz: IP adresi, olay türü, önem derecesi (düşük / orta / yüksek / kritik), tarih aralığı.

---

## 13. Duyurular

Sol menüden **Duyurular**'a tıklayın.

Tüm platforma veya belirli bir kuruma bildirim/duyuru gönderebilirsiniz.

**Duyuru oluşturma adımları:**
1. Hedef kurum seçin (ya da tüm platform)
2. Başlık ve mesaj yazın
3. **Gönder**'e tıklayın

---

## 14. Loglar ve Geçmiş

### Sistem Logları

Sol menüden **Sistem Logları**'na tıklayın.

Backend servislerinin kaydettiği teknik olayları görürsünüz (iş akışı aksiyonları, C# çalıştırma, bildirimler vb.). Kategori ve tarih filtreleriyle arama yapabilirsiniz.

### Aksiyon Geçmişi

Sol menüden **Aksiyon Geçmişi**'ne tıklayın.

"Kim, ne zaman, ne yaptı?" sorusunu yanıtlar. Kullanıcı bazlı veya işlem türüne göre arama yapabilirsiniz.

---

## 15. Kill Switch

Sol menüden **Kill Switch**'e tıklayın.

Acil durumlarda platformun arka planda çalışan iş akışlarını durdurmanıza olanak tanır. **Dikkatli kullanın** — bu işlemlerin anlık etkisi vardır.

### Modlar

| Mod | Ne yapar? |
|-----|-----------|
| **Soft (Yumuşak)** | Yeni iş akışı başlatımlarını durdurur; devam edenler tamamlanır |
| **Hard (Sert)** | Çalışan iş akışlarını da durdurur, C# script çalıştırmayı engeller |
| **Emergency (Acil)** | Tüm pipeline işlemlerini anında durdurur |
| **Devre dışı bırak** | Kill switch kaldırılır, normal işleyişe dönülür |

Etkin bir kill switch varken sayfada hangi modun aktif olduğu ve ne zaman etkinleştirildiği gösterilir.

---

## 16. Sözleşmeler

Sol menüden **Sözleşmeler**'e tıklayın.

Kullanım koşulları ve KVKK aydınlatma metni gibi yasal belgeleri yönetirsiniz.

**Yapabilecekleriniz:**
- Yeni sözleşme oluşturma ve yayınlama
- Mevcut sözleşmeyi güncelleme
- Kullanıcılara yeniden onay zorunluluğu gönderme

---

## 17. E-posta Şablonları

Sol menüden **E-posta Şablonları**'na tıklayın.

Platform tarafından otomatik gönderilen e-postaların içeriğini düzenleyebilirsiniz (hoşgeldin mesajı, e-posta doğrulama, şifre sıfırlama, uyarı bildirimi vb.).

Şablonlarda `{{userName}}` veya `{{platformName}}` gibi değişkenler kullanılabilir; bunlar gönderim sırasında gerçek değerlerle doldurulur.

---

## 18. Hakkımızda İçeriği

Sol menüden **Hakkımızda**'ya tıklayın.

Platformun "Hakkımızda" sayfasındaki içerik bloklarını (misyon, vizyon, ekip vb.) buradan düzenleyebilirsiniz.

---

## 19. Modül Yönetimi

Sol menüden **Modül Yönetimi**'ne tıklayın.

Platformun hangi özelliklerinin açık veya kapalı olduğunu ayarlarsınız. İki ana bölümü vardır:

### Kurum Ayarları

Seçtiğiniz kuruma özgü feature açma/kapama işlemleri. Değiştirdiğiniz ayarlar amber renkle vurgulanır; **Kaydet**'e tıklayana kadar uygulanmaz.

### Platform Ayarları

Tüm platform için geçerli varsayılan değerleri ayarlarsınız. Kurum ayarları bu değerleri geçersiz kılabilir.

### Özellik Tanımı Yönetimi

Yeni bir modül/özellik tanımı ekleyebilir, mevcut olanları güncelleyebilir veya silebilirsiniz. Her tanım için kapsam belirtilir:

- **Kurum kapsamlı:** Her kurum kendi değerini ayarlayabilir
- **Platform kapsamlı (Global):** Tek merkezi değer; kurumlar değiştiremez

---

## 20. Workflow Builder

Sol menüden **Workflow Builder**'a tıklayın.

Görsel olarak iş akışları (otomasyon kuralları) oluşturabileceğiniz editördür.

### Temel Kavramlar

| Kavram | Açıklama |
|--------|----------|
| **Trigger (Tetikleyici)** | İş akışını başlatan olay (ör. yeni sorun oluşturuldu, oy verildi) |
| **Koşul** | Akışın dallandığı nokta (ör. sorun belirli bir kategorideyse) |
| **Aksiyon** | Gerçekleştirilecek işlem (ör. bildirim gönder, kullanıcıyı banla, webhook tetikle) |
| **C# Node** | Özel mantık yazmak için kod bloğu (yalnızca uzman yetkisiyle) |

### İş Akışı Oluşturma

1. Sağ panelden bir **trigger** node'unu canvas'a sürükleyin
2. İstediğiniz kadar **koşul** ve **aksiyon** ekleyin
3. Node'ları birbirine bağlamak için bağlantı noktalarını sürükleyin
4. Üst menüden **Kaydet**'e tıklayın

### Node'u Düzenleme

Bir node'a **çift tıklayın** — sağ taraftan bir panel açılır. Bu panelde:
- Node etiketini değiştirebilirsiniz
- Trigger için olay türünü seçebilirsiniz
- Aksiyon için parametrelerini doldurabilirsiniz
- Vurgu rengini değiştirebilirsiniz

**Kaydet**'e tıkladığınızda değişiklikler canvas'a yansır.

### Klavye Kısayolları

| Kısayol | İşlev |
|---------|-------|
| `Ctrl + Z` | Son işlemi geri al |
| `Ctrl + Y` | Geri alınanı yeniden uygula |
| `Ctrl + F` | Node arama kutusunu aç |
| `Esc` | Aramayı kapat |

### Node Arama

`Ctrl+F` ile arama kutusunu açın. Node adı, türü veya aksiyonuna göre arama yapılır. Eşleşen node'lar vurgulanır ve `N/M` sayacıyla kaç eşleşme bulunduğunu görürsünüz. ▲▼ butonlarıyla eşleşmeler arasında gezinebilirsiniz.

### Test Çalıştırma

Kayıtlı bir iş akışını gerçek ortama etki etmeden test etmek için **🧪 Test-Run** butonuna tıklayın. Sonuç ekranda bir banner olarak gösterilir.

### Çalışma Geçmişi

**🔄 Çalışmalar** sekmesine geçerek geçmiş çalışmaları listeleyin. Bir çalışmaya tıkladığınızda hangi node'ların çalışıp çalışmadığını, hangi aksiyonların başarılı veya başarısız olduğunu detaylıca görebilirsiniz.

---

## 21. Yetki Yönetimi

Sol menüden **Yetki Yönetimi**'ne tıklayın.

Belirli bir kullanıcıya yetki (capability) vermek veya almak için kullanılır.

### Kullanıcı Seçimi

Arama kutusuna kullanıcı adı veya e-posta yazın. Kullanıcıyı seçtikten sonra mevcut yetkileri listelenir.

### Yetki Verme

1. **Yetki Ekle** butonuna tıklayın
2. Listeden yetkiyi seçin
3. Gerekirse son kullanım tarihi ve kapsam belirleyin
4. Bir açıklama (neden) yazın
5. **Onayla**'ya tıklayın

### Yetki Alma

- Tekil kaldırma: Yetki yanındaki **Kaldır** butonuna tıklayın
- Toplu kaldırma: İstenen yetkileri onay kutusuyla seçin → **Toplu Kaldır** → neden yazın → onaylayın

---

## 22. Yetki Şablonları

Sol menüden **Yetki Şablonları**'na tıklayın.

Sık kullanılan yetki grupları önceden paketlenmiştir. Bir şablonu tek tıklamayla bir kullanıcıya uygulayabilirsiniz.

### Şablon Uygulama

1. İstediğiniz şablona tıklayın
2. **Kullanıcıya Uygula** butonunu seçin
3. Açılan arama kutusundan kullanıcıyı bulun
4. Bir neden yazın ve onaylayın

### Şablon Kaldırma

"Şablonu Kaldır" butonuyla bir şablonu daha önce uyguladığınız kullanıcıdan geri alabilirsiniz. Uygulama kapsamındaki tüm yetkiler tek seferde kaldırılır.

---

## 23. Yetki Logları

Sol menüden **Yetki Logları**'na tıklayın.

Tüm yetki verme ve alma işlemlerinin kronolojik kaydını görürsünüz. Her satırda işlemi yapan kişi, etkilenen kullanıcı, yetki adı, işlem türü ve tarih bilgisi yer alır.

Filtreler: İşlemi yapan, etkilenen kullanıcı, işlem türü, yetki adı, tarih aralığı.

Bir satıra tıklayarak işlemin tam detayını (neden, ek bilgiler) açabilirsiniz.

---

## 24. Metrikler

Sol menüden **Metrikler**'e tıklayın. İçeride birden fazla alt sekme bulunur.

### Genel Bakış

Platform genelinin sayısal özeti: aktif kullanıcı, içerik, iş akışı ve sistem kaynakları.

### Yetki Metrikleri

Hangi yetkiler en çok kimde var? Son dönemde ne kadar yetki verildi/alındı? Grafik ve tablolarla gösterilir.

### Workflow Metrikleri

İş akışlarının başarı/başarısızlık oranları, ortalama çalışma süreleri ve en çok tetiklenen olaylar.

### Kullanıcı Metrikleri

Kullanıcı büyüme trendi, kurum dağılımı ve en aktif katkıcılar.

### Sistem Sağlığı

Sunucu kaynakları (işlemci, bellek, disk) ve bağımlı servislerin durumu.

### Audit Log Tarayıcısı

Tüm yetki işlemlerinin ayrıntılı filtrelenebilir kaydı. Belirli bir kullanıcı veya yetki üzerinde yapılan tüm değişiklikleri kronolojik olarak inceleyebilirsiniz.

### Dead-Letter Kuyruğu

İşlenemeyen iş akışı mesajlarının listesi. Her mesajın detayını görüntüleyebilir, sorunu giderdikten sonra **Yeniden Kuyruğa Al** ile tekrar işleme alabilirsiniz.

---

*Herhangi bir sayfaya erişemiyorsanız veya bir işlem butonu görünmüyorsa, bu işlem için gerekli yetkiye sahip olmayabilirsiniz. Yöneticinizden yetki talep edin.*
