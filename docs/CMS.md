# CMS & Datenhaltung

## Übersicht

| Dienst | Zweck | Hosting |
|--------|-------|---------|
| **universal-cms** | Selbstgehostetes Headless-CMS — Inhalte verwalten (Leistungen, Preise, Erfolge), Login, Bild-Upload | Hetzner DE (Docker), `cms.webappniederrhein.de` |

Kein eigenes Directus, keine eigene Firebase Auth/Storage-Instanz für dieses Projekt nötig —
`universal-cms` ist bereits eine geteilte, self-hostete Instanz für mehrere Projekte des Betreibers
und bringt Admin-Login (Firebase Auth) und Bild-Upload (Firebase Storage, intern) schon mit.

---

## universal-cms

### Warum universal-cms statt Directus?

- Bereits self-hosted und produktiv im Einsatz (`cms.webappniederrhein.de`), kein zusätzlicher Dienst
- Fertige Admin-UI, REST-artige Delivery-API (`GET /delivery/{projekt}/{collection}`)
- Vanity-Domain-Bindung möglich (`cms.powercleanniederrhein.de` → nur dieses Projekt), falls gewünscht
- Live-Vorschau unveröffentlichter Entwürfe eingebaut (siehe unten)
- Ein Login/eine Firebase-Instanz für alle Projekte des Betreibers statt pro Website eine eigene

### Projekt & Collections im CMS

Unter `cms.webappniederrhein.de` existiert das Projekt **`powercleanniederrhein`** (Slug) mit
folgenden Collections. Feldnamen müssen exakt so heißen, weil `UniversalCmsContentService`
(`backend/PowerClean.Api/Services/UniversalCmsContentService.cs`) sie 1:1 auf die bestehenden
Models abbildet:

#### `leistungen` — Reinigungsleistungen (→ `ServiceModel`)

| Feld | Typ | Pflicht |
|------|-----|---------|
| `title` | Text | ✅ |
| `description` | Text | ✅ |
| `imageUrl` | Media | |
| `altText` | Text | |
| `sort` | Number | ✅ (Anzeigereihenfolge) |

#### `preise` — Preistabelle (→ `PricingModel`)

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `service` | Text | Leistungsname |
| `sort` | Number | Reihenfolge |
| `tiers` | Json | `[{ "range": "bis 30 m²", "price": "60,00 € pauschal" }, ...]` |

#### `erfolge` — Kundenstimmen (→ `TestimonialModel`)

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `title` | Text | z.B. "Steinterrasse wie neu" |
| `text` | Text | Erfahrungsbericht |
| `imageUrl` | Media | |
| `altText` | Text | |
| `sort` | Number | Reihenfolge |

`settings` (Singleton) und `pages` (Datenschutz/AGB/Impressum) sind noch nicht als Collections
angelegt — die Inhalte bleiben vorerst wie bisher in `frontend/app/{datenschutz,agb,impressum}/`
hartcodiert.

### Backend-Anbindung

`backend/PowerClean.Api/Services/UniversalCmsContentService.cs` implementiert `IContentService`
und ruft die Delivery-API auf. Konfiguriert wird das über die `UniversalCms`-Sektion in
`appsettings.json`:

```json
"UniversalCms": {
  "BaseUrl": "https://cms.webappniederrhein.de",
  "ApiKey": "",
  "ProjectSlug": "powercleanniederrhein"
}
```

`ApiKey` ist ein Secret und bleibt in `appsettings.json` leer — auf dem Server per Umgebungsvariable
`UniversalCms__ApiKey` gesetzt (Key im CMS-Admin-Panel unter Projekt „powercleanniederrhein" →
API-Keys erzeugen). Ist `BaseUrl` leer (siehe `appsettings.Development.json`), fällt der Dienst
automatisch auf `JsonContentService` (die bestehenden JSON-Dateien unter `data/`) zurück — lokale
Entwicklung braucht also keinen CMS-Zugriff.

### Live-Vorschau unveröffentlichter Entwürfe

Beim Bearbeiten eines Eintrags im CMS-Admin-Panel gibt es einen „Vorschau"-Button, der einen
kurzlebigen Link zu `frontend/app/preview/{collectionSlug}/{entryId}` öffnet (Next.js-Route),
die wiederum `backend/PowerClean.Api/Endpoints/PreviewEndpoints.cs` (`GET /api/preview/{token}`)
aufruft — ein reiner Proxy zum CMS, damit das Frontend weiterhin nie direkt mit dem CMS spricht.
Die dafür nötige **Vorschau-URL** ist im CMS-Projekt hinterlegt:

```
https://powercleanniederrhein.de/preview/{collectionSlug}/{entryId}?token={token}
```

### ISR-Revalidierung bei Veröffentlichung

`app/api/revalidate/route.ts` existiert bereits (ursprünglich für Directus Flows gedacht) und
erwartet `POST` mit Header `x-revalidate-secret` und Body `{ "tag": "services" }`. Sinnvoller Weg,
das an universal-cms anzubinden: **Webhook** im CMS-Projekt anlegen (Tab „Webhooks", Event
`entry.published`), Ziel-URL `https://powercleanniederrhein.de/api/revalidate`. universal-cms
signiert den Payload per `X-UniversalCms-Signature` (HMAC-SHA256, Secret wird beim Anlegen des
Webhooks angezeigt) — `route.ts` müsste dafür von der Secret-Header-Prüfung auf eine
Signaturprüfung umgestellt werden (noch offen, aktuell nicht umgesetzt).

---

## Content-Migration: JSON → universal-cms

Die bestehenden Inhalte liegen als JSON-Dateien in `backend/PowerClean.Api/data/` und müssen
einmalig manuell im CMS-Admin-Panel als Einträge angelegt und veröffentlicht werden.

| Quelle | Ziel-Collection | Einträge |
|--------|-----------------|----------|
| `data/services.json` | `leistungen` | 6 |
| `data/pricing.json` | `preise` | 8 |
| `data/testimonials.json` | `erfolge` | 3 |

### Bilder

Bilder werden direkt im CMS-Admin-Panel hochgeladen (Projekt → Media) und beim jeweiligen Eintrag
im `imageUrl`-Feld (Typ Media) ausgewählt — kein separater Firebase-Storage-Upload mehr nötig,
das CMS liefert die Bilder selbst öffentlich unter `https://cms.webappniederrhein.de/media/{id}/...`
aus. `next.config.ts` erlaubt `cms.webappniederrhein.de` bereits als Remote-Image-Pattern.

### Reihenfolge beim Einrichten

1. Im CMS-Admin-Panel die drei Collections (`leistungen`, `preise`, `erfolge`) mit den oben
   genannten Feldern anlegen
2. Bilder hochladen (Projekt → Media)
3. Inhalte aus den JSON-Dateien als Einträge übertragen und veröffentlichen
4. API-Key erzeugen, als `UniversalCms__ApiKey` auf dem Server setzen
5. `UniversalCms:BaseUrl`/`ProjectSlug` in `appsettings.json` prüfen (siehe oben, bereits eingetragen)
