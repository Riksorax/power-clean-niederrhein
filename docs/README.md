# Dokumentation — Power Clean Niederrhein

## Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | Next.js 15 + TypeScript (App Router, SSR/SSG) |
| Backend | ASP.NET Minimal API (.NET 9) |
| CMS | Directus 11 (self-hosted, Hetzner DE) |
| Auth | Firebase Authentication |
| Operative Daten | Firebase Firestore (Kontaktanfragen) |
| Bilder | Firebase Storage |
| Datenbank | PostgreSQL 16 (für Directus) |
| Proxy | Traefik v3 + Let's Encrypt |
| Hosting | Hetzner VPS (Docker Compose) |

---

## Dokumente

| Dokument | Beschreibung |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Gesamtarchitektur, Datenflüsse, Technologie-Entscheidungen |
| [FRONTEND.md](./FRONTEND.md) | Next.js, Projektstruktur, Firebase Auth, ISR, SEO |
| [BACKEND.md](./BACKEND.md) | .NET API, Endpunkte, Firebase JWT-Validierung, Firestore |
| [CMS.md](./CMS.md) | Directus Datenmodell, Firebase Firestore/Storage Rules, DSGVO |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker Compose, CI/CD, Rollback, Backup |
| [SECURITY.md](./SECURITY.md) | TLS, CSP, CORS, Auth, Rate Limiting, DSGVO-Checkliste |
| [SETUP.md](./SETUP.md) | Firebase-Projekt anlegen, lokale Entwicklung, Env-Vars |
| [CUTOVER.md](./CUTOVER.md) | Umstieg Blazor → Next.js ohne Downtime, Rollback-Plan |
| [LEGAL_UPDATES.md](./LEGAL_UPDATES.md) | Geplante Änderungen an Datenschutz & AGB — umzusetzen vor Go-Live |

---

## Migrations-Phasen

| Phase | Inhalt | Abhängigkeiten |
|-------|--------|---------------|
| **1** | .NET Minimal API + JSON-Daten | — |
| **2** | Next.js Frontend (Ablösung Blazor) | Phase 1 |
| **3** | Firebase Auth + Firestore | Phase 2 |
| **4** | Directus CMS + PostgreSQL | Phase 3 |
| **5** | Admin-Bereich in Next.js (/admin) | Phase 3 + 4 |

---

## Schnellstart (Entwicklung)

```bash
# API + Frontend parallel starten
docker compose -f compose-local.yaml up

# Oder einzeln:
cd backend  && dotnet watch run      # http://localhost:5000
cd frontend && npm run dev           # http://localhost:3000
```
