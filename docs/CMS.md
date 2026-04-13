# CMS & Datenhaltung

## Übersicht

| Dienst | Zweck | Hosting |
|--------|-------|---------|
| **Directus** | CMS — Inhalte verwalten (Services, Preise, Seiten) | Hetzner DE (Docker) |
| **Firebase Auth** | Admin-Login (kein eigenes User-Management) | Google Cloud (EU) |
| **Firebase Storage** | Bild-Upload (Admin) + Auslieferung auf Website | Google Cloud (EU) |

---

## Directus CMS

### Warum Directus?

- Fertige Admin-UI — kein CMS selbst bauen
- REST + GraphQL API out-of-the-box
- Daten auf eigenem Server (Hetzner DE) → volle DSGVO-Kontrolle
- SQLite für einfachen Start, PostgreSQL für Produktion
- Kein Vendor Lock-in

### Collections (Datenmodell)

#### `services` — Reinigungsleistungen

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|-------------|
| `id` | integer (PK) | ✅ | Auto-Increment |
| `title` | string | ✅ | z.B. "Terrassenreinigung" |
| `slug` | string | ✅ | URL-freundlich, einzigartig |
| `description` | text | ✅ | Kurzbeschreibung |
| `image_url` | string | ✅ | Firebase Storage URL |
| `sort` | integer | ✅ | Anzeigereihenfolge |
| `status` | enum (published/draft) | ✅ | Sichtbarkeit |

#### `pricing` — Preistabelle

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | integer (PK) | Auto-Increment |
| `service` | string | Leistungsname |
| `unit` | string | z.B. "pro m²", "pauschal" |
| `price_from` | decimal | Mindestpreis |
| `price_to` | decimal | Maximalpreis (optional) |
| `notes` | string | Hinweise |
| `category` | string | Gruppierung |
| `sort` | integer | Reihenfolge |
| `status` | enum | Sichtbarkeit |

#### `testimonials` — Kundenstimmen

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `id` | integer (PK) | Auto-Increment |
| `author_name` | string | Kundenname |
| `location` | string | z.B. "Goch" |
| `quote` | text | Erfahrungsbericht |
| `before_image_url` | string | Firebase Storage URL |
| `after_image_url` | string | Firebase Storage URL |
| `service` | string | Welche Leistung |
| `sort` | integer | Reihenfolge |
| `status` | enum | Sichtbarkeit |

#### `settings` — Globale Einstellungen (Singleton)

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `company_name` | string | Firmenname |
| `phone` | string | Telefonnummer |
| `email` | string | Kontakt-E-Mail |
| `address_street` | string | Straße + Nr. |
| `address_city` | string | Stadt |
| `address_zip` | string | PLZ |
| `service_areas` | json | Array von Ortsnamen |
| `hero_title` | string | Hauptüberschrift |
| `hero_subtitle` | text | Unterüberschrift |
| `og_image_url` | string | Firebase Storage URL |

#### `pages` — Statische Seiten

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| `slug` | string | `datenschutz`, `agb`, `impressum` |
| `title` | string | Seitentitel |
| `content` | wysiwyg | Rich-Text-Inhalt (HTML) |
| `updated_at` | datetime | Letzte Änderung |

### Directus Docker-Konfiguration

```yaml
# Zum compose.yaml hinzufügen (Phase 4)
  cms:
    image: directus/directus:11
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - directus_uploads:/directus/uploads
    environment:
      SECRET:            "${DIRECTUS_SECRET}"
      DB_CLIENT:         "pg"
      DB_HOST:           "postgres"
      DB_PORT:           "5432"
      DB_DATABASE:       "directus"
      DB_USER:           "${POSTGRES_USER}"
      DB_PASSWORD:       "${POSTGRES_PASSWORD}"
      ADMIN_EMAIL:       "${DIRECTUS_ADMIN_EMAIL}"
      ADMIN_PASSWORD:    "${DIRECTUS_ADMIN_PASSWORD}"
      PUBLIC_URL:        "https://cms.powercleanniederrhein.de"
      CORS_ENABLED:      "true"
      CORS_ORIGIN:       "https://powercleanniederrhein.de"
      # Webhook → Next.js ISR Revalidierung
      FLOWS_ENV_ALLOW_LIST: "REVALIDATE_SECRET,NEXTJS_URL"
      REVALIDATE_SECRET: "${REVALIDATE_SECRET}"
      NEXTJS_URL:        "http://frontend:3000"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.cms.rule=Host(`cms.powercleanniederrhein.de`)"
      - "traefik.http.routers.cms.tls.certresolver=letsencrypt"
      - "traefik.http.routers.cms.middlewares=cms-ip-whitelist"
      - "traefik.http.middlewares.cms-ip-whitelist.ipallowlist.sourcerange=${ADMIN_IP_WHITELIST}"
    networks:
      - traefik-proxy
      - internal
```

### Directus Flow — ISR Revalidierung

Automatischer Webhook, der bei Inhaltsänderungen die Next.js-Seite neu generiert:

```
Trigger:    Items Updated/Created (services, pricing, testimonials, settings)
Operation:  Webhook POST http://frontend:3000/api/revalidate
Headers:    x-revalidate-secret: {{REVALIDATE_SECRET}}
```

---

## Firebase Storage

### Ordnerstruktur

```
Firebase Storage
├── services/           ← Bilder für Leistungen
│   ├── terrace.webp
│   └── ...
├── testimonials/       ← Vorher-Nachher-Fotos
│   ├── before-1.webp
│   └── ...
└── general/            ← Hero-Bild, OG-Image
    └── header.webp
```

### Storage Security Rules

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Lesen: Alle (öffentliche Bilder für die Website)
    match /{allPaths=**} {
      allow read: if true;
    }

    // Schreiben: NUR authentifizierte Admin-User
    match /services/{fileName} {
      allow write: if request.auth != null
                   && request.auth.token.email_verified == true
                   && request.resource.size < 5 * 1024 * 1024      // Max 5 MB
                   && request.resource.contentType.matches('image/.*');
    }

    match /testimonials/{fileName} {
      allow write: if request.auth != null
                   && request.auth.token.email_verified == true
                   && request.resource.size < 10 * 1024 * 1024     // Max 10 MB
                   && request.resource.contentType.matches('image/.*');
    }

    match /general/{fileName} {
      allow write: if request.auth != null
                   && request.auth.token.email_verified == true;
    }
  }
}
```

---

## Firebase Auth

### Setup

- Anmeldemethode: **E-Mail + Passwort** (für Admins)
- Optional: **Google Sign-In** (einmaliger Klick für den Betreiber)
- MFA: Empfohlen für Produktion (TOTP via Google Authenticator)
- Firebase Console: `Authentication > Users` — Benutzer manuell anlegen

### Benutzer

| Benutzer | Rolle | Zugriff |
|----------|-------|---------|
| `info@powercleanniederrhein.de` | Admin | Alles |
| (zukünftig) Mitarbeiter | Redakteur | Nur lesen |

### Custom Claims (für feinere Rechtevergabe)

```typescript
// Firebase Admin SDK (einmalig beim User-Anlegen)
await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
```

```javascript
// Firestore Rules mit Custom Claims
allow write: if request.auth.token.role == 'admin';
```

---

## Content-Migration: Blazor → Directus

Die bestehenden Inhalte sind in den Blazor-Komponenten hardcodiert.
Sie müssen einmalig manuell in Directus eingetragen werden.

### Zu migrierende Inhalte

| Quelle (Blazor) | Ziel (Directus Collection) | Datensätze |
|-----------------|---------------------------|-----------|
| `LeistungenSection.razor` | `services` | 6 Leistungen |
| `ZusatzleistungenSection.razor` | `pricing` | ~8 Einträge |
| `ErfolgeSection.razor` | `testimonials` | 3 Einträge |
| `KontaktSection.razor` | `settings` | 1 Singleton |
| `Datenschutz.razor`, `AGB.razor`, `Impressum.razor` | `pages` | 3 Seiten |

### Bilder migrieren

Die WebP-Bilder aus `wwwroot/images/` müssen in Firebase Storage hochgeladen werden:

```bash
# Firebase CLI: alle Bilder hochladen
firebase storage:cp wwwroot/images/ gs://BUCKET_NAME/services/ --recursive
```

Danach die Storage-URLs in Directus bei den jeweiligen Einträgen eintragen.

### Reihenfolge beim Einrichten

1. Directus Collections anlegen (Felder, Typen)
2. Rollen und API-Token konfigurieren ([Rollen & Berechtigungen](#rollen--berechtigungen))
3. Bilder in Firebase Storage hochladen
4. Inhalte in Directus manuell eintragen
5. `.NET API` auf `DirectusContentService` umstellen
6. Directus Flow (ISR-Webhook) konfigurieren

---

## DSGVO-Hinweise Firebase

Da Firebase auf Google-Infrastruktur läuft, sind folgende Maßnahmen nötig:

| Maßnahme | Details |
|----------|---------|
| **Region** | Firebase-Projekt auf `europe-west3` (Frankfurt) setzen |
| **Datenschutzerklärung** | Firebase erwähnen (Auth + Firestore + Storage) |
| **Auftragsverarbeitungsvertrag** | Google Cloud DPA (Data Processing Agreement) abschließen |
| **Kontaktformular** | Keine Speicherung in Firebase — Anfragen gehen direkt per E-Mail (SMTP) |
| **Storage-Bilder** | Nur Bilder (keine personenbezogenen Daten) in Firebase Storage |
