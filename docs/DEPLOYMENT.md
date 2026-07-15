# Deployment

## Container-Übersicht (Ziel-Zustand)

```
Hetzner VPS
├── Traefik             → TLS, Routing
├── frontend            → Next.js (Node.js Standalone)
└── api                 → .NET Minimal API

universal-cms (fremdes, bereits laufendes Projekt des Betreibers)
└── cms.webappniederrhein.de → Admin-Login, Content-Verwaltung, Bild-Upload
```

Kein eigener CMS-Container, keine eigene Datenbank, keine eigene Firebase-Instanz für dieses
Projekt nötig — siehe `docs/CMS.md`/`docs/ARCHITECTURE.md`.

Der Blazor-Vorgänger (`powerclean`-Service, siehe `docs/CUTOVER.md`) wurde direkt durch
`frontend`+`api` ersetzt statt über einen Parallelbetrieb schrittweise umzuschalten.

---

## docker-compose.yaml

```yaml
services:
  frontend:
    image: riksorax/power-clean-frontend:latest
    restart: unless-stopped
    environment:
      - API_URL=http://api:8080
      - NEXT_PUBLIC_API_URL=https://powercleanniederrhein.de
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
      - UniversalCms__BaseUrl=https://cms.webappniederrhein.de
      - UniversalCms__ApiKey=${UNIVERSALCMS_API_KEY}
      - UniversalCms__ProjectSlug=powercleanniederrhein
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
| `REVALIDATE_SECRET` | ISR Revalidierungs-Secret |
| `UNIVERSALCMS_API_KEY` | API-Key des Projekts „powercleanniederrhein" im universal-cms |

---

## Staging-Umgebung (optional)

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

Staging sollte auf ein **separates Projekt** im universal-cms zeigen (eigener
`UniversalCms__ProjectSlug` + eigener API-Key), damit Test-Inhalte nicht mit den
Produktionsdaten kollidieren.

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

## Backup-Strategie

Content-Backups (Einträge, Bilder) sind Sache der universal-cms-Instanz selbst (Firestore +
Firebase Storage, eigener Backup-Plan) — dieses Repo hält selbst keine Redaktionsdaten mehr vor.

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
