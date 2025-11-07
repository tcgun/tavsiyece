# Tavsiye Çemberi - Web Versiyonu

Tavsiye Çemberi'nin Next.js ile geliştirilmiş web versiyonu. Güvenilir tavsiyelerle dolu bir sosyal platform.

## Özellikler

- 🔐 Kullanıcı kimlik doğrulama (Giriş/Kayıt)
- 📱 Responsive tasarım (Mobil ve masaüstü uyumlu)
- 📝 Tavsiye paylaşma ve yönetme
- 👥 Kullanıcı profilleri ve takip sistemi
- 📋 Liste oluşturma ve yönetme
- 🔔 Bildirimler
- 🔍 Kullanıcı ve tavsiye arama
- ❤️ Beğeni ve kaydetme özellikleri
- ⚙️ Kullanıcı ayarları

## Teknolojiler

- **Next.js 15** - React framework
- **Firebase** - Authentication, Firestore, Storage
- **Tailwind CSS** - Styling
- **Font Awesome** - İkonlar

## Kurulum

1. Projeyi klonlayın:
```bash
git clone <repository-url>
cd tavsiye-cemberi-next
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Firebase yapılandırmasını ayarlayın:
   - `.env.local` dosyası oluşturun
   - Firebase projenizin bilgilerini ekleyin:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

5. Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

## Firebase Kurulumu

1. [Firebase Console](https://console.firebase.google.com/)'da yeni bir proje oluşturun
2. Authentication'ı etkinleştirin (Email/Password)
3. Firestore Database'i oluşturun
4. Storage'ı etkinleştirin
5. Web uygulaması ekleyin ve yapılandırma bilgilerini alın

## Proje Yapısı

```
src/
├── app/              # Next.js App Router sayfaları
│   ├── arama/        # Arama sayfası
│   ├── ayarlar/      # Ayarlar sayfaları
│   ├── bildirimler/  # Bildirimler sayfası
│   ├── giris/        # Giriş/Kayıt sayfası
│   ├── profil/       # Profil sayfaları
│   ├── tavsiye/      # Tavsiye detay sayfası
│   └── ...
├── components/       # React bileşenleri
├── firebase/         # Firebase yardımcı fonksiyonları
└── hooks/           # Custom React hooks
```

## Kullanım

- **Ana Sayfa**: Takip ettiğiniz kullanıcıların tavsiyelerini görüntüleyin
- **Arama**: Kullanıcı ve tavsiye arayın
- **Profil**: Kendi profilinizi görüntüleyin ve düzenleyin
- **Yeni Tavsiye**: Tavsiye paylaşın
- **Listeler**: Tavsiyelerinizi listeler halinde organize edin

## Deployment

### Vercel ile Deploy

1. Projeyi GitHub'a push edin
2. [Vercel](https://vercel.com)'e giriş yapın
3. Yeni proje ekleyin ve GitHub repository'nizi seçin
4. Environment variables'ları ekleyin
5. Deploy edin

### Diğer Platformlar

Next.js uygulaması herhangi bir Node.js hosting platformunda çalışabilir.

## Lisans

Bu proje özel bir projedir.

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen pull request göndermeden önce değişikliklerinizi test edin.
