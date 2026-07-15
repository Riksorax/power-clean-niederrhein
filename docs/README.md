# Dokumentation — Power Clean Niederrhein

## Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | **Next.js 16** + TypeScript (App Router, SSR/ISR) |
| Backend | ASP.NET Minimal API (**.NET 10**) |
| CMS | universal-cms (fremdes, self-hostetes Projekt) — `cms.webappniederrhein.de` |
| Kontaktanfragen | SMTP E-Mail (EmailService — unverändert aus Blazor) |
| Proxy | Traefik v3 + Let's Encrypt |
| Hosting | Hetzner VPS (Docker Compose) |

---

## Dokumente

| Dokument | Beschreibung |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Gesamtarchitektur, Datenflüsse, Phasen-Status, Technologie-Entscheidungen |
| [FRONTEND.md](./FRONTEND.md) | Next.js 16, Projektstruktur, ISR, Tailwind v4, Zod v4, Migration-Mapping |
| [BACKEND.md](./BACKEND.md) | .NET API, Endpunkte, EmailService, IContentService, universal-cms-Anbindung |
| [CMS.md](./CMS.md) | universal-cms Collections/Feld-Zuordnung, Live-Vorschau, Content-Migration |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker Compose, CI/CD, Rollback, Backup |
| [SECURITY.md](./SECURITY.md) | TLS, CSP, CORS, Rate Limiting, DSGVO-Checkliste |
| [SETUP.md](./SETUP.md) | Lokale Entwicklung, Env-Vars |
| [CUTOVER.md](./CUTOVER.md) | Umstieg Blazor → Next.js ohne Downtime, Rollback-Plan |
| [LEGAL_UPDATES.md](./LEGAL_UPDATES.md) | Geplante Änderungen an Datenschutz & AGB — vor Go-Live umzusetzen |

---

## Migrations-Phasen

| Phase | Inhalt | Status |
|-------|--------|--------|
| **1** | .NET Minimal API + JSON-Datenhaltung | ✅ Fertig |
| **2** | Next.js Frontend (Ablösung Blazor, SSR/ISR) | ✅ Fertig |
| **3** | Anbindung an universal-cms (Content, Live-Vorschau) | ✅ Code fertig — Collections/Einträge im CMS-Admin folgen |
| **4** | ISR-Revalidierung per CMS-Webhook | ⏳ Geplant |

---

## Schnellstart (Entwicklung)

```bash
# Terminal 1: Backend (http://localhost:5000)
cd backend/PowerClean.Api
dotnet watch run

# Terminal 2: Frontend (http://localhost:3000)
cd frontend
npm install
npm run dev
```

Umgebungsvariablen:
```bash
cp frontend/.env.local.example frontend/.env.local
# → Werte eintragen (SMTP-Settings per dotnet user-secrets, siehe SETUP.md)
```
