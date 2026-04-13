# Deployment

## Container-Übersicht (Ziel-Zustand)

```
Hetzner VPS
├── Traefik             → TLS, Routing, IP-Whitelist
├── frontend            → Next.js (Node.js Standalone)
├── api                 → .NET Minimal API
├── cms                 → Directus Admin UI  [Phase 4]
└── postgres            → PostgreSQL (internes Netz)  [Phase 4]

Firebase (Google Cloud, europe-west3)
├── Authentication      → Admin-Login
├── Firestore           → Kontaktanfragen
└── Storage             → Bilder
```

---

## docker-compose.yaml (Phase 1–3)

```yaml
services:
  frontend:
    image: riksorax/power-clean-frontend:latest
    restart: unless-stopped
    environment:
      - API_URL=http://api:8080
      - NEXT_PUBLIC_API_URL=https://powercleanniederrhein.de
      - NEXT_PUBLIC_FIREBASE_API_KEY=${FIREBASE_API_KEY}
      - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}
      - NEXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
      - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}
      - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}
      - NEXT_PUBLIC_FIREBASE_APP_ID=${FIREBASE_APP_ID}
      - FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
      - FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
      - COOKIE_SECRET=${COOKIE_SECRET}
      - REVALIDATE_SECRET=${REVALIDATE_SECRET}
    networks:
      - traefik-proxy
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`powercleanniederrhein.de`) || Host(`www.powercleanniederrhein.de`)"
      - "traefik.http.routers.frontend.entrypoints=websecure"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"

  api:
    image: riksorax/power-clean-api:latest
    restart: unless-stopped
    environment:
      - SmtpSettings__Host=${SMTP_HOST}
      - SmtpSettings__Port=${SMTP_PORT}
      - SmtpSettings__Username=${SMTP_USERNAME}
      - SmtpSettings__Password=${SMTP_PASSWORD}
      - SmtpSettings__FromEmail=${SMTP_FROM_EMAIL}
      - SmtpSettings__ToEmail=${SMTP_TO_EMAIL}
      - AllowedOrigins=https://powercleanniederrhein.de
      - Firebase__ProjectId=${FIREBASE_PROJECT_ID}
      - Firebase__ServiceAccountJson=${FIREBASE_SERVICE_ACCOUNT_JSON}
      - ASPNETCORE_ENVIRONMENT=Production
    networks:
      - traefik-proxy
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`powercleanniederrhein.de`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=8080"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

networks:
  traefik-proxy:
    external: true
  internal:
    internal: true
```

---

## docker-compose.yaml (Phase 4 — mit Directus + PostgreSQL)

```yaml
# Ergänzungen zu Phase 1-3:
  cms:
    image: directus/directus:11
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - directus_uploads:/directus/uploads
    environment:
      SECRET:           "${DIRECTUS_SECRET}"
      DB_CLIENT:        "pg"
      DB_HOST:          "postgres"
      DB_DATABASE:      "directus"
      DB_USER:          "${POSTGRES_USER}"
      DB_PASSWORD:      "${POSTGRES_PASSWORD}"
      ADMIN_EMAIL:      "${DIRECTUS_ADMIN_EMAIL}"
      ADMIN_PASSWORD:   "${DIRECTUS_ADMIN_PASSWORD}"
      PUBLIC_URL:       "https://cms.powercleanniederrhein.de"
      CORS_ENABLED:     "true"
      CORS_ORIGIN:      "https://powercleanniederrhein.de"
      REVALIDATE_SECRET: "${REVALIDATE_SECRET}"
      NEXTJS_URL:       "http://frontend:3000"
    networks:
      - traefik-proxy
      - internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.cms.rule=Host(`cms.powercleanniederrhein.de`)"
      - "traefik.http.routers.cms.entrypoints=websecure"
      - "traefik.http.routers.cms.tls.certresolver=letsencrypt"
      - "traefik.http.routers.cms.middlewares=cms-whitelist"
      - "traefik.http.middlewares.cms-whitelist.ipallowlist.sourcerange=${ADMIN_IP_WHITELIST}"
      - "traefik.http.services.cms.loadbalancer.server.port=8055"

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB:       "directus"
      POSTGRES_USER:     "${POSTGRES_USER}"
      POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
    networks:
      - internal          # Kein Traefik-Zugriff!
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  directus_uploads:
```

---

## Dockerfiles

### Frontend (Next.js Standalone)

```dockerfile
# frontend/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup --system nodejs && adduser --system nextjs --ingroup nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Backend (.NET API)

```dockerfile
# backend/Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src
COPY PowerClean.Api.csproj .
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup
COPY --from=build --chown=appuser:appgroup /app/publish .
USER appuser
EXPOSE 8080
ENTRYPOINT ["dotnet", "PowerClean.Api.dll"]
```

---

## GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy

on:
  push:
    branches: [master]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - service: frontend
            context: ./frontend
          - service: api
            context: ./backend
    steps:
      - uses: actions/checkout@v4

      - name: Login Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build & Push ${{ matrix.service }}
        uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          push: true
          tags: |
            riksorax/power-clean-${{ matrix.service }}:latest
            riksorax/power-clean-${{ matrix.service }}:sha-${{ github.sha }}

      - name: Vulnerability Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: riksorax/power-clean-${{ matrix.service }}:latest
          severity: CRITICAL,HIGH
          exit-code: 1

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/power-clean-niederrhein
            git pull origin master
            docker compose pull
            docker compose up -d --remove-orphans
            docker image prune -f
```

### Benötigte GitHub Secrets

| Secret | Beschreibung |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub Benutzername |
| `DOCKER_PASSWORD` | Docker Hub Access Token |
| `SERVER_HOST` | Hetzner Server IP/Domain |
| `SERVER_USER` | SSH-Benutzer (kein root!) |
| `SERVER_SSH_KEY` | Privater SSH-Schlüssel |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` | SMTP |
| `SMTP_FROM_EMAIL` / `SMTP_TO_EMAIL` | E-Mail-Adressen |
| `FIREBASE_API_KEY` | Firebase Web API Key |
| `FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `FIREBASE_PROJECT_ID` | Firebase Projekt-ID |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | FCM Sender ID |
| `FIREBASE_APP_ID` | Firebase App ID |
| `FIREBASE_CLIENT_EMAIL` | Service Account E-Mail |
| `FIREBASE_PRIVATE_KEY` | Service Account Private Key |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Vollständiges Service Account JSON |
| `COOKIE_SECRET` | Min. 32 Zeichen, zufällig |
| `REVALIDATE_SECRET` | ISR Revalidierungs-Secret |
| `DIRECTUS_SECRET` | Directus App-Secret [Phase 4] |
| `DIRECTUS_ADMIN_EMAIL` | Directus Admin E-Mail [Phase 4] |
| `DIRECTUS_ADMIN_PASSWORD` | Directus Admin Passwort [Phase 4] |
| `POSTGRES_USER` | PostgreSQL Benutzer [Phase 4] |
| `POSTGRES_PASSWORD` | PostgreSQL Passwort [Phase 4] |
| `ADMIN_IP_WHITELIST` | IP-Whitelist für CMS [Phase 4] |

---

## Staging-Umgebung (optional, empfohlen ab Phase 3)

Für Änderungen die vor dem Produktions-Go-Live getestet werden sollen,
kann ein zweiter Compose-Stack auf demselben Server laufen:

```yaml
# compose-staging.yaml
services:
  frontend:
    image: riksorax/power-clean-frontend:sha-${STAGING_SHA}
    environment:
      - NEXT_PUBLIC_API_URL=https://staging.powercleanniederrhein.de
    labels:
      - "traefik.http.routers.frontend-staging.rule=Host(`staging.powercleanniederrhein.de`)"
      - "traefik.http.routers.frontend-staging.middlewares=staging-auth"
      # Basic Auth: Staging nicht öffentlich zugänglich
      - "traefik.http.middlewares.staging-auth.basicauth.users=${STAGING_BASIC_AUTH}"
```

```bash
# Staging deployen
docker compose -f compose-staging.yaml up -d

# Basic Auth User generieren (htpasswd)
echo $(htpasswd -nb user passwort) | sed -e s/\\$/\\$\\$/g
```

Staging nutzt denselben Firebase-Account, aber **separate Collections** in Directus
(z.B. Prefix `staging_services`), damit Produktionsdaten unberührt bleiben.

---

## Lokale Entwicklung

### compose-local.yaml

```yaml
services:
  frontend:
    build:
      context: ./frontend
      target: builder
    ports:
      - "3000:3000"
    environment:
      - API_URL=http://localhost:5000
      - NEXT_PUBLIC_API_URL=http://localhost:5000
      # Firebase: lokale .env.local Datei verwenden
    volumes:
      - ./frontend/src:/app/src     # Hot Reload
    command: npm run dev

  api:
    build: ./backend
    ports:
      - "5000:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
    volumes:
      - ./backend/data:/app/data    # JSON-Dateien editierbar
```

```bash
# Starten
docker compose -f compose-local.yaml up

# Oder einzeln:
cd backend  && dotnet watch run
cd frontend && npm run dev
```

---

## Rollback

```bash
# Auf vorherige Version zurückrollen (über Git-SHA Tag)
docker pull riksorax/power-clean-api:sha-COMMIT_SHA
docker tag riksorax/power-clean-api:sha-COMMIT_SHA riksorax/power-clean-api:latest
docker compose up -d api
```

---

## Backup-Strategie (Phase 4)

### PostgreSQL (Directus-Daten)

```bash
# Täglicher Backup-Cronjob auf dem Server
0 3 * * * docker exec postgres pg_dump -U $POSTGRES_USER directus | gzip > /backups/directus-$(date +%Y%m%d).sql.gz

# Alte Backups löschen (älter als 30 Tage)
find /backups -name "directus-*.sql.gz" -mtime +30 -delete
```

### Firebase (Firestore)

Firebase Console → Firestore → Export to Google Cloud Storage (täglich, automatisch konfigurierbar).

---

## Monitoring & Alerting

### Sentry (Fehler-Tracking)

```typescript
// frontend/instrumentation.ts (Next.js)
import * as Sentry from '@sentry/nextjs';
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});
```

```csharp
// backend/Program.cs
builder.WebHost.UseSentry(opt =>
{
    opt.Dsn         = builder.Configuration["Sentry:Dsn"];
    opt.Environment = builder.Environment.EnvironmentName;
    opt.TracesSampleRate = 0.2;
});
```

DSN aus [sentry.io](https://sentry.io) — kostenloser Free-Tier ausreichend für dieses Projekt.

### Uptime-Monitoring

Empfehlung: **UptimeRobot** (kostenlos, 5-Minuten-Intervall)

Zu überwachende URLs:
| URL | Typ | Alert bei |
|-----|-----|-----------|
| `https://powercleanniederrhein.de` | HTTP(S) | Status ≠ 200 |
| `https://powercleanniederrhein.de/api/health` | HTTP(S) | Status ≠ 200 |
| TLS-Zertifikat | SSL | Ablauf < 14 Tage |

Alarmierung: E-Mail an `info@powercleanniederrhein.de`.

---

## Monitoring & Health Checks

```yaml
# In docker-compose.yaml
api:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    interval: 30s
    timeout: 5s
    retries: 3

frontend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
    interval: 30s
    timeout: 5s
    retries: 3
```

Traefik Dashboard zeigt Health-Status aller Container in Echtzeit.
