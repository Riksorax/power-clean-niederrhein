# Setup — Lokale Entwicklungsumgebung & Ersteinrichtung

## Voraussetzungen

| Tool | Version | Zweck |
|------|---------|-------|
| Node.js | 22 LTS | Next.js Frontend |
| .NET SDK | 9.0 | Backend API |
| Docker + Compose | aktuell | Lokale Services |
| Firebase CLI | aktuell | Firebase-Projekt verwalten |
| Git | aktuell | Versionskontrolle |

```bash
# Versionen prüfen
node -v && dotnet --version && docker -v && firebase --version
```

---

## 1. Firebase-Projekt anlegen (einmalig)

### Projekt erstellen

1. [Firebase Console](https://console.firebase.google.com) öffnen
2. „Projekt hinzufügen" → Name: `power-clean-niederrhein`
3. Google Analytics: aktivieren (bereits in Nutzung: `G-VZXRZKDCR1`)
4. **Region einstellen:** `europe-west3` (Frankfurt)
   - Wichtig: Wird beim ersten Firestore/Storage-Setup abgefragt
   - Einmal gesetzt — nicht mehr änderbar!

### Authentication aktivieren

Firebase Console → Authentication → Sign-in method:
- **E-Mail/Passwort**: aktivieren
- Passwort-Richtlinie: min. 12 Zeichen, Groß/Klein/Zahlen/Sonderzeichen
- MFA (optional, empfohlen): Authentication → Multi-factor auth → Enable

Admin-Benutzer anlegen:
```
Authentication → Users → Add user
E-Mail: info@powercleanniederrhein.de
Passwort: [sicher generiert, min. 20 Zeichen]
```

### Firebase Storage aktivieren

Firebase Console → Storage → Get started:
- Region: `europe-west3` bestätigen
- Security Rules: zunächst Standardregel, dann [CMS.md](./CMS.md) Storage Rules deployen

### Service Account für Backend

Firebase Console → Projekteinstellungen → Service-Accounts:
1. „Neuen privaten Schlüssel generieren"
2. JSON-Datei herunterladen → **niemals in Git einchecken!**
3. Inhalt als Umgebungsvariable `FIREBASE_SERVICE_ACCOUNT_JSON` speichern

```bash
# Inhalt der JSON-Datei als einzelne Zeile (Zeilenumbrüche escapen)
cat firebase-service-account.json | tr -d '\n'
```

### Firebase CLI einrichten

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # Projekt auswählen: power-clean-niederrhein
```

### Firebase Storage Rules deployen

```bash
# storage.rules aus CMS.md erstellen, dann:
firebase deploy --only storage
```

---

## 2. Umgebungsvariablen einrichten

### Frontend (`frontend/.env.local`)

```bash
cp frontend/.env.local.example frontend/.env.local
```

Werte aus Firebase Console eintragen:
```bash
# Firebase Console → Projekteinstellungen → Allgemein → Deine Apps → Web-App
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=power-clean-niederrhein.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=power-clean-niederrhein
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=power-clean-niederrhein.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (aus Service Account JSON)
FIREBASE_PROJECT_ID=power-clean-niederrhein
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@power-clean-niederrhein.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Next.js intern
API_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000
COOKIE_SECRET=min32zeichenzufälligergenerierterstring
REVALIDATE_SECRET=andererzufälligerstring
```

> **Wichtig bei `FIREBASE_PRIVATE_KEY`:** Zeilenumbrüche müssen als `\n` (escaped)
> in der `.env.local` stehen. Die `"..."` Anführungszeichen sind nötig.

### Backend (`backend/.env` oder User Secrets)

```bash
# Für lokale Entwicklung: .NET User Secrets verwenden
cd backend/PowerClean.Api
dotnet user-secrets set "SmtpSettings:Host" "mail.example.com"
dotnet user-secrets set "SmtpSettings:Port" "587"
dotnet user-secrets set "SmtpSettings:Username" "info@powercleanniederrhein.de"
dotnet user-secrets set "SmtpSettings:Password" "geheim"
dotnet user-secrets set "SmtpSettings:FromEmail" "info@powercleanniederrhein.de"
dotnet user-secrets set "SmtpSettings:ToEmail" "info@powercleanniederrhein.de"
dotnet user-secrets set "Firebase:ProjectId" "power-clean-niederrhein"
dotnet user-secrets set "Firebase:ServiceAccountJson" "$(cat firebase-service-account.json)"
dotnet user-secrets set "AllowedOrigins" "http://localhost:3000"
```

---

## 3. Lokale Entwicklung starten

### Option A — Einzeln starten (empfohlen für Entwicklung)

```bash
# Terminal 1: Backend
cd backend/PowerClean.Api
dotnet watch run
# → http://localhost:5000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Option B — Docker Compose (alle Services)

```bash
docker compose -f compose-local.yaml up --build
# Frontend: http://localhost:3000
# API:      http://localhost:5000
# Directus: http://localhost:8055  (Phase 4)
```

---

## 4. Directus Ersteinrichtung (Phase 4)

### Collections anlegen

Nach `docker compose up` für Directus:

1. `http://localhost:8055` öffnen
2. Login mit `DIRECTUS_ADMIN_EMAIL` + `DIRECTUS_ADMIN_PASSWORD`
3. Collections gemäß [CMS.md](./CMS.md) anlegen:
   - `services` (Felder: title, slug, description, image_url, sort, status)
   - `pricing` (Felder: service, unit, price_from, price_to, notes, category, sort, status)
   - `testimonials` (Felder: author_name, location, quote, before_image_url, after_image_url, sort, status)
   - `settings` (Singleton: company_name, phone, email, address_*, hero_title, hero_subtitle)
   - `pages` (Felder: slug, title, content [wysiwyg], updated_at)

### API-Token für Backend erstellen

Directus Console → Einstellungen → API-Tokens → Token erstellen:
- Name: `api-backend`
- Berechtigungen: Nur lesen auf allen Content-Collections
- Token kopieren → `DIRECTUS_TOKEN` in `.env` eintragen

### Bestehende Inhalte importieren

Siehe [CMS.md — Content-Migration](./CMS.md#content-migration-von-blazor-nach-directus).

---

## 5. Produktions-Deployment vorbereiten

### Server `.env` Datei

```bash
# Auf dem Hetzner-Server anlegen:
ssh user@server
cat > /opt/power-clean-niederrhein/.env << 'EOF'
# SMTP
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USERNAME=info@powercleanniederrhein.de
SMTP_PASSWORD=
SMTP_FROM_EMAIL=info@powercleanniederrhein.de
SMTP_TO_EMAIL=info@powercleanniederrhein.de

# Firebase (Public)
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# Firebase (Secret)
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=

# Next.js
COOKIE_SECRET=
REVALIDATE_SECRET=

# Directus (Phase 4)
DIRECTUS_SECRET=
DIRECTUS_ADMIN_EMAIL=
DIRECTUS_ADMIN_PASSWORD=
POSTGRES_USER=directus
POSTGRES_PASSWORD=
ADMIN_IP_WHITELIST=
EOF

chmod 600 /opt/power-clean-niederrhein/.env
```

### GitHub Secrets befüllen

Alle Werte aus der `.env` müssen als GitHub Secrets hinterlegt sein.
Vollständige Liste: [DEPLOYMENT.md](./DEPLOYMENT.md#benötigte-github-secrets).
