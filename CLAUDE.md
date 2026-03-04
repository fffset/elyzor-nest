# elyzor-nest

TypeScript + NestJS ile yazılmış API kimlik doğrulama ve yetkilendirme servisi.
Orijinal Express uygulamasından (`/Users/erkan/elyzors/elyzor`) migrate edilmiştir.

## Teknoloji Yığını

- **Framework:** NestJS 10 (Express platform)
- **Veritabanı:** MongoDB (Mongoose)
- **Cache / Rate Limit:** Redis (ioredis)
- **Auth:** passport-jwt + bcrypt + httpOnly cookie (refresh token)
- **Logger:** nestjs-pino
- **Dokümentasyon:** @nestjs/swagger (`/docs`)

## Geliştirme

```bash
cp .env.example .env   # env değişkenlerini doldur
npm install
npm run start:dev      # nodemon + ts-node
```

Production build:

```bash
npm run build          # dist/ klasörüne derler
npm start              # cluster.ts → dist/cluster.js
```

## Mimari

**Kural:** Module → Controller → Service → Repository. Strict DDD uygulanmaz.

```
src/
  main.ts              # Bootstrap, global middleware/pipe/filter
  app.module.ts        # Tüm modülleri birleştiren kök modül
  cluster.ts           # Multi-worker cluster (CPU başına 1 worker)

  config/
    env.ts             # Zorunlu env değişkenleri — eksikse uygulama başlamaz
    redis.module.ts    # @Global RedisModule, token: 'REDIS_CLIENT'

  errors/              # AppError ve alt sınıflar (UnauthorizedError vb.)

  common/
    guards/
      jwt-auth.guard.ts          # Tüm korumalı endpoint'lerde kullan
      ip-rate-limiter.guard.ts   # Sadece /verify endpoint'lerinde
    filters/
      all-exceptions.filter.ts   # Global exception filter
    interceptors/
      request-id.interceptor.ts  # X-Request-Id header
    decorators/
      current-user.decorator.ts  # @CurrentUser('userId') / @CurrentUser('email')
      raw-token.decorator.ts     # @RawToken() — logout için Bearer token

  auth/                # JWT + refresh token rotation
  users/               # User model ve repository (sadece export eder)
  projects/            # CRUD + cascade delete
  apikeys/             # API key yönetimi (sk_live_...)
  services/            # Servis credential'ları (svc_live_...)
  usage/               # Kullanım logu ve istatistik aggregation
  verification/        # POST /verify — API key doğrulama
  verify-service/      # POST /verify/service — servis key doğrulama
  stats/               # GET /projects/:id/stats
  health/              # GET /health
```

## Modül Bağımlılıkları

Circular dependency `forwardRef()` ile çözülmüştür:

```
ProjectsModule ←→ ApiKeysModule   (forwardRef)
ProjectsModule ←→ ServicesModule  (forwardRef)
```

`forwardRef()` sadece bu iki çiftte vardır. Başka hiçbir modüle ekleme.

## API Rotaları

Tüm rotalar `/v1` prefix'i ile başlar (`main.ts`'de `setGlobalPrefix('v1')`).

| Metot | Rota | Guard | Açıklama |
|-------|------|-------|----------|
| POST | /v1/auth/register | — | Kayıt |
| POST | /v1/auth/login | — | Giriş |
| POST | /v1/auth/refresh | — | Token yenile (cookie) |
| POST | /v1/auth/logout | JWT | Çıkış |
| POST | /v1/auth/logout-all | JWT | Tüm oturumları kapat |
| GET | /v1/auth/me | JWT | Profil |
| GET | /v1/projects | JWT | Proje listesi |
| POST | /v1/projects | JWT | Proje oluştur |
| DELETE | /v1/projects/:id | JWT | Proje sil (cascade) |
| GET | /v1/projects/:id/keys | JWT | API key listesi |
| POST | /v1/projects/:id/keys | JWT | API key oluştur |
| DELETE | /v1/projects/:id/keys/:keyId | JWT | API key iptal |
| POST | /v1/projects/:id/keys/:keyId/rotate | JWT | API key döndür |
| GET | /v1/projects/:id/services | JWT | Servis listesi |
| POST | /v1/projects/:id/services | JWT | Servis oluştur |
| DELETE | /v1/projects/:id/services/:serviceId | JWT | Servis iptal |
| POST | /v1/projects/:id/services/:serviceId/rotate | JWT | Servis döndür |
| GET | /v1/projects/:id/stats | JWT | İstatistikler (?range=1d\|7d\|30d) |
| POST | /v1/verify | IP limit | API key doğrula |
| POST | /v1/verify/service | IP limit | Servis key doğrula |
| GET | /v1/health | — | Sağlık kontrolü |

## Kritik Tasarım Kararları

### JWT + Refresh Token
- Access token: JWT 15 dakika, Authorization Bearer header
- Refresh token: 48 byte random hex, httpOnly cookie (`refreshToken`)
- Rotation: Her `/refresh` çağrısında eski token revoke → yeni token verilir
- Token hırsızlığı: Revoke edilmiş token kullanılırsa tüm oturumlar kapatılır
- Blacklist: Logout sonrası access token Redis'e yazılır (TTL = token'ın kalan süresi)

### API Key Formatı
- `sk_live_<8-hex>.<64-hex>` — DB'ye sadece secretHash (sha256) kaydedilir
- Servis key: `svc_live_<8-hex>.<64-hex>`

### Verification Cache
- Redis'te 5 dakika TTL: `apikey:<secretHash>` ve `svckey:<keyHash>`
- Key revoke edildiğinde cache anında temizlenir

### Rate Limiting
- IP bazlı (Redis INCR): `/v1/verify` endpoint'leri — fail open (Redis down = geçir)
- Key/proje bazlı: Verification servisi içinde — fail closed (Redis down = reddet)

### Hata Formatı
Tüm hatalar `{ error: string, message: string }` formatında döner.
`AllExceptionsFilter` hem `AppError` alt sınıflarını hem `ValidationPipe` hatalarını bu formata dönüştürür.

## Env Değişkenleri

```
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/elyzor
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_IP_MAX=60
RATE_LIMIT_IP_WINDOW_SECONDS=60
RATE_LIMIT_KEY_MAX=100
RATE_LIMIT_KEY_WINDOW_SECONDS=60
BCRYPT_ROUNDS=12
```

`config/env.ts` başlangıçta tüm zorunlu değişkenleri kontrol eder. Eksik varsa uygulama başlamaz.
