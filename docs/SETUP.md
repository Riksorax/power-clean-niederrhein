# Setup — Lokale Entwicklungsumgebung & Ersteinrichtung

## Voraussetzungen

| Tool | Version | Zweck |
|------|---------|-------|
| Node.js | 22 LTS | Next.js Frontend |
| .NET SDK | **10.0** | Backend API |
| Docker + Compose | aktuell | Lokale Services |
| Git | aktuell | Versionskontrolle |

```bash
# Versionen prüfen
node -v && dotnet --version && docker -v
```

Kein Firebase CLI mehr nötig — dieses Projekt hat keine eigene Firebase-Instanz, Admin-Login
und Bild-Upload laufen über das externe universal-cms (`cms.webappniederrhein.de`).

---

## 1. universal-cms (externes, bereits laufendes Projekt)

Nichts hier einzurichten — das CMS existiert schon und wird nur per API angesprochen. Siehe
[CMS.md](./CMS.md) für die dort anzulegenden Collections/Felder und wie du an einen API-Key
kommst.

---

## 2. Umgebungsvariablen einrichten

### Frontend (`frontend/.env.local`)

```bash
cp frontend/.env.local.example frontend/.env.local
```

Pflichtfelder:
```bash
# .NET API
API_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000

# ISR-Revalidierung
REVALIDATE_SECRET=<beliebig zufällig>
```

Secret generieren:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Backend (`backend/PowerClean.Api`)

SMTP über User Secrets (lokale Entwicklung):

```bash
cd backend/PowerClean.Api
dotnet user-secrets set "SmtpSettings:Host"      "mail.example.com"
dotnet user-secrets set "SmtpSettings:Port"      "587"
dotnet user-secrets set "SmtpSettings:Username"  "info@powercleanniederrhein.de"
dotnet user-secrets set "SmtpSettings:Password"  "geheim"
dotnet user-secrets set "SmtpSettings:FromEmail" "info@powercleanniederrhein.de"
dotnet user-secrets set "SmtpSettings:ToEmail"   "info@powercleanniederrhein.de"
dotnet user-secrets set "AllowedOrigins"         "http://localhost:3000"
```

universal-cms-Anbindung ist standardmäßig **aus** (`appsettings.Development.json` setzt
`UniversalCms:BaseUrl` explizit leer) — Inhalte kommen lokal aus den JSON-Dateien unter `data/`.
Willst du lokal gegen das echte CMS testen:

```bash
dotnet user-secrets set "UniversalCms:BaseUrl" "https://cms.webappniederrhein.de"
dotnet user-secrets set "UniversalCms:ApiKey" "ucms_..."
dotnet user-secrets set "UniversalCms:ProjectSlug" "powercleanniederrhein"
```

---

## 3. Lokale Entwicklung starten

### Empfohlen: Einzeln starten

```bash
# Terminal 1: Backend
cd backend/PowerClean.Api
dotnet watch run
# → http://localhost:5000
# → http://localhost:5000/swagger (Swagger UI)

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Alternativ: Docker Compose

```bash
docker compose -f compose-local.yaml up --build
# Frontend: http://localhost:3000
# API:      http://localhost:5000
```

---

## 4. Build überprüfen

```bash
# Backend (0 Fehler erwartet)
cd backend/PowerClean.Api && dotnet build

# Frontend (0 TypeScript-Fehler erwartet)
# HINWEIS: ECONNREFUSED-Warnungen beim Build sind normal (API läuft nicht beim Build)
cd frontend && npm run build
```

---

## 5. Inhalte im CMS anlegen

Siehe [CMS.md — Content-Migration](./CMS.md#content-migration-json--universal-cms) für die
Collections, Feld-Zuordnung und welche Einträge aus den bestehenden JSON-Dateien zu übertragen sind.

---

## 6. Produktions-Deployment vorbereiten

### Server `.env` Datei

```bash
ssh user@server
cat > /opt/power-clean-niederrhein/.env << 'EOF'
# SMTP
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USERNAME=info@powercleanniederrhein.de
SMTP_PASSWORD=
SMTP_FROM_EMAIL=info@powercleanniederrhein.de
SMTP_TO_EMAIL=info@powercleanniederrhein.de

# Next.js
REVALIDATE_SECRET=

# universal-cms
UNIVERSALCMS_API_KEY=
EOF

chmod 600 /opt/power-clean-niederrhein/.env
```

### GitHub Secrets befüllen

Alle Werte aus der `.env` müssen als GitHub Secrets hinterlegt sein.
Vollständige Liste: [DEPLOYMENT.md](./DEPLOYMENT.md#benötigte-github-secrets).
