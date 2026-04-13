# Architektur-Übersicht — Power Clean Niederrhein

## Ist-Zustand

```
Browser
  │
  ▼
Traefik (Reverse Proxy + TLS)
  │
  ▼
Blazor Server (.NET 9)
  ├── Razor-Komponenten (UI + Logik in einem)
  ├── EmailService (SMTP)
  └── Hardcoded Content (Services, Preise, Testimonials)
```

**Probleme des aktuellen Stands:**
- Jede Inhaltsänderung erfordert Code-Änderung + Deployment
- Kein CMS — Kunde kann Inhalte nicht selbst pflegen
- UI und Geschäftslogik nicht getrennt
- Blazor Server hält SignalR-Verbindung → Sticky Sessions nötig
- Schlecht skalierbar

---

## Ziel-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser / Next.js                        │
│                                                             │
│   Öffentliche Seite          Admin-Bereich (/admin)         │
│   (SSR/SSG, SEO)             (Firebase Auth geschützt)      │
└────────┬──────────────────────────────┬────────────────────┘
         │ HTTPS                        │ HTTPS + Firebase JWT
         ▼                              ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│   .NET Minimal API  │    │         Directus CMS            │
│                     │    │   (Admin UI für Redakteure)      │
│ - Content ausliefern│    │   - Services, Preise, Seiten     │
│ - Firebase JWT prüfen    │   - Via .NET API abgerufen       │
│ - Kontaktformular   │    └─────────────────────────────────┘
│   → SMTP E-Mail     │
│   (unverändert)     │
└────────┬────────────┘
         │
    ┌────┴─────────────────────────────────┐
    │                                      │
    ▼                                      ▼
┌──────────────────┐           ┌───────────────────────────┐
│  Directus CMS    │           │      Firebase (Google)    │
│  (SQLite/PG)     │           │                           │
│  Hetzner DE      │           │  Auth    — Admin-Login    │
│                  │           │  Storage — Bilder         │
│  Services        │           │                           │
│  Preise          │           │  (Region: europe-west3)   │
│  Testimonials    │           └───────────────────────────┘
│  Seiten          │
└──────────────────┘
```

---

## Dienste & Zuständigkeiten

| Dienst | Technologie | Zweck | Hosting |
|--------|-------------|-------|---------|
| Frontend | Next.js 15 + TypeScript | Öffentliche Website + Admin-UI | Docker / Hetzner |
| API | ASP.NET Minimal API (.NET 9) | Business-Logik, JWT-Validierung | Docker / Hetzner |
| CMS | Directus 11 | Inhalte verwalten (Admin-UI) | Docker / Hetzner |
| Datenbank | SQLite (Entwicklung) / PostgreSQL (Produktion) | Directus-Datenhaltung | Docker / Hetzner |
| Auth | Firebase Authentication | Admin-Login (kein eigenes User-Mgmt) | Google Cloud |
| Bilder | Firebase Storage | Bild-Upload (Admin) + Auslieferung auf Website | Google Cloud (EU) |
| Proxy | Traefik v3 | TLS, Routing | Hetzner |

---

## Datenfluss

### 1. Öffentliche Seite (SSR/SSG)

```
Next.js Server Component
  → GET /api/services          (.NET API)
    → Directus REST API         (intern, Service-Token)
      → SQLite/PostgreSQL
  ← JSON
← HTML gerendert (SSR/ISR)
```

### 2. Kontaktformular

```
Browser (Next.js)
  → POST /api/contact          (.NET API)
    → Validierung
    → SMTP E-Mail               (EmailService — unverändert aus Blazor)
  ← { success: true }
```

### 3. Admin-Login & CMS

```
Browser (/admin)
  → Firebase Auth (Google / E-Mail)
  ← Firebase ID Token (JWT)

  → GET /api/admin/...         (.NET API, mit JWT im Header)
    → JWT validieren            (Firebase Admin SDK)
    → Directus API              (intern, Service-Token)
  ← Daten
```

### 4. Bild-Upload (Admin)

```
Browser (/admin/upload)
  → Firebase Auth Token validieren
  → Firebase Storage SDK direkt  (Client-seitig, Storage Rules)
  ← Download-URL
  → .NET API: Directus-Eintrag aktualisieren (mit URL)
```

---

## Phasen-Übersicht

| Phase | Inhalt |
|-------|--------|
| **1** | .NET Minimal API + JSON-Datenhaltung (Migration von Blazor) |
| **2** | Next.js Frontend (Ablösung Blazor, SSR/SSG) |
| **3** | Firebase Auth + Storage (Admin-Login, Bild-Upload) |
| **4** | Directus CMS + Admin-Bereich in Next.js |
| **5** | PostgreSQL für Directus (Produktion), Backup-Strategie |

---

## Technologie-Entscheidungen

### Warum Next.js statt reinem React?

- **SSR/SSG**: Seiten werden serverseitig gerendert → bessere SEO (für Google Maps, Ranking)
- **App Router**: Layouts, Server Components, parallel Data Fetching
- **ISR** (Incremental Static Regeneration): Seiten werden gecacht und nur bei CMS-Änderung neu gebaut
- **Image Optimization**: `next/image` optimiert WebP-Bilder automatisch
- **API Routes**: Können .NET API in Entwicklung simulieren oder als Proxy dienen

### Warum Firebase Auth statt eigenem User-Management?

- Kein Implementierungsaufwand für Login, Passwort-Reset, Sessions
- MFA optional zuschaltbar
- DSGVO: Nur Admin-User (1–2 Personen) → kein Kundendaten-Problem
- Firebase Auth-Daten (UID, E-Mail) verlassen die EU nicht zwingend, aber:
  → Firebase Projekt auf `europe-west3` (Frankfurt) setzen

### Warum Firebase Storage für Bilder?

- Kein eigener Datei-Server nötig
- CDN-Auslieferung über Google-Infrastruktur (schnell)
- Einfacher Upload-Flow im Admin-Bereich
- DSGVO: Region `europe-west3` (Frankfurt) → Daten bleiben in EU

### Kontaktformular — E-Mail bleibt unverändert

Das bestehende `EmailService`-System (SMTP) wird **1:1 aus der Blazor-App übernommen**.
Kein Firestore, keine neue Infrastruktur — Anfragen landen weiterhin direkt per E-Mail.

### Warum Directus für CMS?

- Fertige Admin-UI (kein eigenes CMS bauen)
- REST + GraphQL API out-of-the-box
- Feingranuläre Berechtigungen
- Daten auf eigenem Server (Hetzner DE) → volle Kontrolle
- Kein Vendor Lock-in
