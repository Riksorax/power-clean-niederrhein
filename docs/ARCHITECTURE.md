# Architektur-Übersicht — Power Clean Niederrhein

## Vorheriger Stand (abgelöst)

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

**Probleme des damaligen Stands:**
- Jede Inhaltsänderung erfordert Code-Änderung + Deployment
- Kein CMS — Kunde kann Inhalte nicht selbst pflegen
- UI und Geschäftslogik nicht getrennt
- Blazor Server hält SignalR-Verbindung → Sticky Sessions nötig
- Schlecht skalierbar

---

## Ziel-Architektur

Admin-Login und Content-Pflege laufen komplett über **universal-cms** — ein bereits
self-hostetes, projektübergreifendes Headless-CMS des Betreibers (`cms.webappniederrhein.de`).
Die Next.js-App braucht deshalb **kein eigenes `/admin`** und **keine eigene Firebase Auth/Storage-
Instanz** mehr — beides bringt das CMS schon mit, geteilt über mehrere Websites hinweg.

```
┌──────────────────────┐        ┌──────────────────────────────┐
│  Browser (Website)   │        │  Browser (Redakteur)         │
│  powercleanniederrhein.de     │  cms.webappniederrhein.de     │
└──────────┬───────────┘        └──────────────┬───────────────┘
           │ HTTPS                             │ HTTPS + Firebase Auth
           ▼                                   ▼
┌──────────────────────┐        ┌──────────────────────────────┐
│  Next.js 16 (SSR/ISR)│        │       universal-cms          │
│  öffentliche Seite   │        │  (Admin-UI, fremdes Projekt,  │
└──────────┬───────────┘        │   self-hosted, Firebase Auth  │
           │ HTTPS (intern)     │   + Storage bereits intern)   │
           ▼                    └──────────────┬───────────────┘
┌──────────────────────┐                       │
│  .NET Minimal API     │  GET /delivery/...    │
│  - Content ausliefern │──────────────────────►│ (x-api-key)
│  - Preview-Proxy      │  GET /api/preview/... │
│  - Kontaktformular     │──────────────────────►│ (kurzlebiges Token)
│    → SMTP E-Mail      │
│    (unverändert)      │
└───────────────────────┘
```

Das Frontend spricht **nie direkt** mit universal-cms — alle externen Aufrufe laufen über die
.NET API (`UniversalCmsContentService`, `PreviewEndpoints`), damit z.B. der API-Key nie im Browser
landet.

---

## Dienste & Zuständigkeiten

| Dienst | Technologie | Zweck | Hosting |
|--------|-------------|-------|---------|
| Frontend | **Next.js 16** + TypeScript | Öffentliche Website (SSR/ISR) | Docker / Hetzner |
| API | ASP.NET Minimal API (**.NET 10**) | Content ausliefern, Kontaktformular, Preview-Proxy | Docker / Hetzner |
| CMS | universal-cms (fremdes Projekt, self-hosted) | Inhalte verwalten, Admin-Login, Bild-Upload | Hetzner DE, `cms.webappniederrhein.de` |
| Proxy | Traefik v3 | TLS, Routing | Hetzner |

---

## Phasen-Übersicht

| Phase | Inhalt | Status |
|-------|--------|--------|
| **1** | .NET Minimal API + JSON-Datenhaltung | ✅ Fertig |
| **2** | Next.js Frontend (Ablösung Blazor, SSR/ISR) | ✅ Fertig |
| **3** | Anbindung an universal-cms (`UniversalCmsContentService`, Preview-Proxy) | ✅ Code fertig — Collections/Einträge im CMS-Admin noch manuell anzulegen |
| **4** | ISR-Revalidierung per Webhook bei Veröffentlichung | ⏳ Geplant (siehe `docs/CMS.md`) |

---

## Datenfluss

### 1. Öffentliche Seite (ISR)

```
Next.js Server Component (page.tsx)
  → fetchApi("/api/services")          ← lib/api/server.ts (API_URL intern)
    → GET /api/services                (.NET API, Output-Cache 10 Min)
      → JsonContentService             (Fallback: keine UniversalCms:BaseUrl konfiguriert)
      → UniversalCmsContentService     (GET /delivery/powercleanniederrhein/leistungen, x-api-key)
  ← JSON
← HTML gerendert (ISR, 10 Min Cache, revalidateTag-fähig)
```

### 2. Kontaktformular

```
Browser (KontaktSection.tsx — Client Component)
  → POST /api/contact               (.NET API, via NEXT_PUBLIC_API_URL)
    → Validierung (DataAnnotations)
    → Rate Limiting (3/10 Min)
    → SMTP E-Mail                   (EmailService — 1:1 aus Blazor)
  ← { success: true } / 429
```

### 3. Live-Vorschau eines Entwurfs

```
Redakteur klickt "Vorschau" im CMS-Admin-Panel (cms.webappniederrhein.de)
  → CMS erzeugt kurzlebigen (10 Min) signierten Token
  → öffnet https://powercleanniederrhein.de/preview/{collectionSlug}/{entryId}?token=...

Next.js (app/preview/[collectionSlug]/[entryId]/page.tsx)
  → fetch(`${API_URL}/api/preview/${token}`)        (no-store, kein ISR-Cache)
    → .NET API: GET /api/preview/{token}             (PreviewEndpoints.cs, reiner Proxy)
      → universal-cms: GET /api/preview/{token}      (kein x-api-key nötig, Token ist Nachweis)
  ← Entwurfsdaten unabhängig vom Veröffentlichungsstatus
```

---

## Technologie-Entscheidungen

### Warum Next.js statt reinem React?

- **SSR/ISR**: Seiten werden serverseitig gerendert → bessere SEO
- **App Router**: Layouts, Server Components, parallel Data Fetching
- **ISR** (Incremental Static Regeneration): Seiten nur bei CMS-Änderung neu gebaut
- **Image Optimization**: `next/image` optimiert WebP-Bilder automatisch
- **API Routes**: Webhook-Endpunkt für ISR-Revalidierung (`/api/revalidate`)

### Kontaktformular — E-Mail bleibt unverändert

Das bestehende `EmailService`-System (SMTP) wird **1:1 aus der Blazor-App übernommen**.
Kein Firestore, keine neue Infrastruktur — Anfragen landen direkt per E-Mail.

### Warum universal-cms statt Directus?

- Bereits self-hosted und produktiv im Einsatz für andere Projekte des Betreibers — kein
  zusätzlicher Dienst, keine zusätzliche Datenbank
- Bringt Admin-Login (Firebase Auth) und Bild-Upload (Firebase Storage, intern) schon mit —
  spart Phase 3 (eigene Firebase-Anbindung) komplett
- Live-Vorschau unveröffentlichter Entwürfe eingebaut
- Ein Login für alle Projekte des Betreibers statt pro Website eine eigene CMS-Installation
