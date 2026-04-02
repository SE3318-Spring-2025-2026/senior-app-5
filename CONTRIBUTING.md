# Katkida Bulunma Rehberi

Bu depoya katkida bulunmak istediginiz icin tesekkurler.
Bu rehber, kod degisikliklerinin daha hizli incelenmesi ve guvenli sekilde birlestirilmesi icin izlenecek standartlari aciklar.

## Kapsam

- Backend: NestJS (`backend/`)
- Frontend: `frontend/`
- Dokumantasyon: `docs/`

## Gereksinimler

- Node.js 18+
- npm
- Docker (MongoDB icin)

## Yerel Ortam Kurulumu

1. Depoyu klonlayin ve klasore girin.
2. Backend bagimliliklarini yukleyin:

```bash
cd backend
npm install
```

3. MongoDB servisini kaldirin:

```bash
cd ..
docker compose up -d
```

4. Uygulamayi gelistirme modunda calistirin:

```bash
cd backend
npm run start:dev
```

## Branch Stratejisi

- Ana gelistirme dali: `main`
- Her is icin yeni bir branch acin:
  - `feature/<kisa-aciklama>`
  - `fix/<kisa-aciklama>`
  - `docs/<kisa-aciklama>`

Ornek:

```bash
git checkout -b feature/auth-refresh-token
```

## Kod Standartlari

- Mevcut proje yapisini ve isimlendirme stilini koruyun.
- Degisikligi minimum kapsamda tutun; ilgisiz refactor eklemeyin.
- Gerekmedikce genel API davranisini degistirmeyin.
- Kodunuz acik degilse kisa ve amac odakli yorumlar ekleyin.

## Commit Kurallari

Kisa, acik ve amac belirten commit mesajlari kullanin.

Onerilen format:

```text
<tur>: <kisa-aciklama>
```

Ornekler:

- `feat: add jwt refresh token endpoint`
- `fix: validate login payload`
- `docs: update process5 API spec`

## PR Acmadan Once

Degisiklik yaptiginiz bolumde asagidakileri calistirin.

Backend icin (`backend/`):

```bash
npm run lint
npm run test
```

Eger endpoint, is akislar veya sozlesme degisti ise ilgili dokumani da guncelleyin:

- API spesifikasyonlari: `docs/api/api-specs/`
- Sistem surecleri: `docs/system-processes.md`

## Pull Request Kurallari

PR acarken asagidaki bilgileri ekleyin:

- Degisikligin amaci
- Yapilan degisikliklerin ozeti
- Test kaniti (komut ciktilari veya ekran goruntusu)
- Varsa kirilim riski ve geri donus plani

PR kapsamini kucuk tutmaya calisin. Buyuk degisiklikleri birden fazla PR'a bolmek inceleme hizini artirir.

## Issue ve Iletisim

- Yeni bir ozellik veya buyuk refactor oncesi issue acip kapsam belirleyin.
- Mevcut bir issue uzerinde calisiyorsaniz PR aciklamasina issue numarasini ekleyin.

Katkiniz icin tesekkurler.