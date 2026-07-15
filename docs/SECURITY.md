# Security

## Bedrohungsmodell

Power Clean Niederrhein ist eine Marketing-Website mit Kontaktformular. Admin-Login und
Content-Pflege laufen extern über universal-cms (`cms.webappniederrhein.de`) — dessen
Bedrohungsmodell wird dort verwaltet, nicht in diesem Repo.

| Angriffsziel | Risiko | Gegenmaßnahme |
|-------------|--------|---------------|
| Kontaktformular (Spam, Injection) | Hoch | Rate Limiting, Input-Validierung |
| Preview-Proxy (`/api/preview/{token}`) | Niedrig | Kurzlebiges (10 Min), signiertes Token — kein API-Key im Client |
| Server-Infrastruktur | Mittel | SSH-Härtung, Firewall, kein Root-Zugriff |

---

## 1. Transport-Sicherheit (TLS)

**Status: ✅ Bereits umgesetzt (Traefik + Let's Encrypt)**

```yaml
# Traefik: Starke TLS-Konfiguration
tls:
  options:
    default:
      minVersion: VersionTLS12
      cipherSuites:
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
      sniStrict: true
```

- HTTP → HTTPS Redirect: ✅
- HSTS Header: siehe Abschnitt 2
- TLS 1.0/1.1 deaktiviert

---

## 2. HTTP Security Headers

### Frontend (nginx / Next.js)

```nginx
# Strict Transport Security — 1 Jahr, inkl. Subdomains, Preload-fähig
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Kein Framing erlaubt (Clickjacking)
add_header X-Frame-Options "DENY" always;

# Kein MIME-Sniffing
add_header X-Content-Type-Options "nosniff" always;

# Referrer auf same-origin begrenzen
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Unnötige Browser-Features sperren
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
```

### Content Security Policy

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src  'self'
              https://www.googletagmanager.com
              https://www.google-analytics.com
              https://ccm19.de
              'nonce-GENERIERT_PRO_REQUEST';
  style-src   'self' 'unsafe-inline';
  img-src     'self' data:
              https://firebasestorage.googleapis.com
              https://www.google-analytics.com;
  font-src    'self';
  connect-src 'self'
              https://www.google-analytics.com
              https://identitytoolkit.googleapis.com
              https://securetoken.googleapis.com
              https://firestore.googleapis.com;
  frame-src   'none';
  object-src  'none';
  base-uri    'self';
  form-action 'self';
" always;
```

### Backend (.NET API)

```csharp
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    ctx.Response.Headers.Append("X-Frame-Options", "DENY");
    ctx.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    // Keine Technologie-Hinweise preisgeben
    ctx.Response.Headers.Remove("Server");
    ctx.Response.Headers.Remove("X-Powered-By");
    await next();
});
```

---

## 3. CORS

**Regel:** Nur die eigene Domain darf die API aufrufen. Nie Wildcard.

```csharp
// .NET API — explizite Whitelist
builder.Services.AddCors(opt =>
    opt.AddPolicy("Frontend", p =>
        p.WithOrigins("https://powercleanniederrhein.de")
         .WithMethods("GET", "POST", "PUT")
         .WithHeaders("Content-Type", "Authorization")
         .SetPreflightMaxAge(TimeSpan.FromHours(24))));
```

```typescript
// Next.js — API-Aufrufe nur serverseitig (Server Components)
// Kein CORS-Problem, da Server-zu-Server
const data = await fetch(`${process.env.API_URL}/api/services`);
// API_URL ist intern (http://api:8080), nicht öffentlich
```

---

## 4. Firebase Auth Sicherheit

### Token-Handling (HttpOnly Cookies)

```typescript
// middleware.ts — Firebase JWT nie im localStorage!
// next-firebase-auth-edge setzt Token als HttpOnly-Cookie
cookieSerializeOptions: {
  httpOnly: true,         // Kein JS-Zugriff auf Token
  secure: true,           // Nur HTTPS
  sameSite: 'lax',        // CSRF-Schutz
  maxAge: 60 * 60 * 24 * 7, // 7 Tage
}
```

**Niemals:**
```typescript
// ❌ Token im localStorage — XSS-angreifbar!
localStorage.setItem('firebaseToken', token);
```

### Token-Validierung im Backend

```csharp
// .NET API validiert Firebase JWT bei JEDEM Request
var decoded = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token);
// VerifyIdTokenAsync prüft:
// - Signatur (via Google's public keys)
// - Ablaufzeit (exp)
// - Aussteller (iss)
// - Zielgruppe (aud = Firebase Project ID)
```

### Multi-Factor Authentication (empfohlen)

Firebase Auth unterstützt TOTP (Google Authenticator, Authy):

```typescript
// MFA in Firebase Console aktivieren:
// Authentication > Sign-in method > Multi-factor authentication > Enable
```

### Passwort-Richtlinie

Firebase Console → Authentication → Password policy:
- Mindestlänge: 12 Zeichen
- Großbuchstaben: erforderlich
- Ziffern: erforderlich
- Sonderzeichen: erforderlich

---

## 5. Input-Validierung & Injection-Schutz

### SQL Injection

**Direkte SQL-Injection ist in diesem Stack nicht möglich** — aus folgendem Grund:

| Schicht | Datenzugriff | Schutz |
|---------|-----------------|--------|
| .NET API | Liest JSON-Dateien oder HTTP von universal-cms | kein direktes SQL |
| universal-cms | Firestore (Google Cloud) über Google-Client-Bibliothek | kein SQL, eigenes Sicherheitsmodell |

Das .NET API schreibt **nie** eigenes SQL und hat keine eigene Datenbank — alle Inhalte kommen
entweder aus lokalen JSON-Dateien (Entwicklung) oder per HTTP von universal-cms (Produktion).

### NoSQL Injection

Dieses Projekt selbst nutzt keine eigene Datenbank. universal-cms nutzt intern Firestore —
dessen Absicherung ist Sache des CMS, nicht dieses Repos.
Direkter Browser-Schreibzugriff auf Storage ist durch Security Rules gesperrt (siehe Abschnitt 8).

### Path Traversal (.NET API — JSON-Datenhaltung Phase 1)

Das .NET API liest JSON-Dateien aus einem fest konfigurierten Verzeichnis.
Pfade dürfen nie aus User-Input zusammengesetzt werden:

```csharp
// ✅ Sicher: fester Pfad, keine User-Input-Komponente
var path = Path.Combine(
    _env.ContentRootPath, "data", "services.json");

// ❌ Gefährlich — niemals so:
var path = Path.Combine("data", userInput + ".json");
```

### Kontaktformular — Backend

```csharp
public record ContactFormModel
{
    [Required, MinLength(2), MaxLength(100)]
    public string Name { get; init; } = "";

    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; init; } = "";

    [Phone, MaxLength(30)]
    public string? Phone { get; init; }

    // Nur erlaubte Werte
    [Required]
    [AllowedValues("Terrassenreinigung", "Gehwegreinigung", "Balkonreinigung",
                   "Auffahrtreinigung", "Parkplatzreinigung", "Winterdienst",
                   "Hausfassade", "Sonstiges")]
    public string Service { get; init; } = "";

    [Required, MinLength(10), MaxLength(2000)]
    public string Message { get; init; } = "";

    [Required]
    public bool PrivacyAccepted { get; init; }
}
```

### HTML-Encoding (XSS in E-Mails verhindern)

```csharp
// Alle User-Inputs HTML-encodieren bevor sie in E-Mail-Template eingesetzt werden
html = html
    .Replace("{{NAME}}",    HtmlEncoder.Default.Encode(model.Name))
    .Replace("{{EMAIL}}",   HtmlEncoder.Default.Encode(model.Email))
    .Replace("{{MESSAGE}}", HtmlEncoder.Default.Encode(model.Message));
```

### Kontaktformular — Frontend (Zod)

```typescript
export const contactSchema = z.object({
  name:    z.string().min(2).max(100).trim(),
  email:   z.string().email().max(200).toLowerCase(),
  phone:   z.string().max(30).optional(),
  service: z.enum([
    'Terrassenreinigung', 'Gehwegreinigung', 'Balkonreinigung',
    'Auffahrtreinigung', 'Parkplatzreinigung', 'Winterdienst',
    'Hausfassade', 'Sonstiges'
  ]),
  message:         z.string().min(10).max(2000).trim(),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Datenschutz muss akzeptiert werden' })
  }),
});
```

---

## 6. Rate Limiting

```csharp
builder.Services.AddRateLimiter(opt =>
{
    // Kontaktformular: max. 3 Anfragen / 10 Minuten / IP
    opt.AddFixedWindowLimiter("contact", o =>
    {
        o.PermitLimit = 3;
        o.Window      = TimeSpan.FromMinutes(10);
        o.QueueLimit  = 0;
    });

    // Allgemeine API: 60 Anfragen / Minute / IP
    opt.AddFixedWindowLimiter("general", o =>
    {
        o.PermitLimit = 60;
        o.Window      = TimeSpan.FromMinutes(1);
    });

    opt.RejectionStatusCode = 429;
    opt.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.Headers.RetryAfter = "60";
        await ctx.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Zu viele Anfragen. Bitte 60 Sekunden warten." }, ct);
    };
});
```

---

## 7. Firestore Security Rules

> **Nicht relevant** — Firestore wird in diesem Projekt nicht verwendet.  
> Kontaktanfragen werden ausschließlich per SMTP-E-Mail verarbeitet.  
> Firebase Storage Rules sind in Abschnitt 8 dokumentiert.

---

## 8. Firebase Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Öffentliches Lesen (Bilder auf der Website)
    match /{allPaths=**} {
      allow read: if true;
    }

    // Schreiben: nur authentifizierte, verifizierte Admins
    match /services/{fileName} {
      allow write: if isAuthenticatedAdmin()
                   && isImage()
                   && request.resource.size < 5 * 1024 * 1024;
    }

    match /testimonials/{fileName} {
      allow write: if isAuthenticatedAdmin()
                   && isImage()
                   && request.resource.size < 10 * 1024 * 1024;
    }

    match /general/{fileName} {
      allow write: if isAuthenticatedAdmin()
                   && isImage();
    }

    // Hilfsfunktionen
    function isAuthenticatedAdmin() {
      return request.auth != null
             && request.auth.token.email_verified == true;
    }

    function isImage() {
      return request.resource.contentType.matches('image/.*');
    }
  }
}
```

### File Upload — MIME-Type Validierung

Firebase Storage Rules prüfen `contentType` — aber das allein reicht nicht,
da der Client den Content-Type Header fälschen kann.
Zusätzliche Absicherung im Admin-Frontend:

```typescript
// components/admin/ImageUpload.tsx
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png'];
const MAX_SIZE_MB   = 5;

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type))
    return 'Nur WebP, JPEG und PNG erlaubt.';
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return `Datei darf max. ${MAX_SIZE_MB} MB groß sein.`;
  return null;
}
```

Auch der Dateiname wird bereinigt vor dem Upload:

```typescript
// Sonderzeichen aus Dateiname entfernen (Path Traversal)
const safeName = file.name
  .replace(/[^a-zA-Z0-9._-]/g, '-')
  .toLowerCase();
const storageRef = ref(storage, `services/${Date.now()}-${safeName}`);
```

---

## 9. Secrets-Management

### Was niemals in Git darf

```gitignore
# Secrets
.env
.env.local
.env.production
.env*.local
firebase-service-account.json
*.pem
*.key
*.pfx

# Build-Artefakte
.next/
dist/
node_modules/
bin/
obj/
```

### GitHub Secrets (CI/CD)

| Secret | Beschreibung |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub Benutzername |
| `DOCKER_PASSWORD` | Docker Hub Access Token |
| `SERVER_HOST` | Hetzner Server IP |
| `SERVER_USER` | SSH-Benutzer (kein root!) |
| `SERVER_SSH_KEY` | Privater SSH-Schlüssel |
| `SMTP_*` | SMTP-Zugangsdaten |
| `UNIVERSALCMS_API_KEY` | API-Key des Projekts im universal-cms |

### Server `.env` Datei

```bash
# /opt/power-clean/.env — nur auf dem Server, nie in Git!
chmod 600 /opt/power-clean/.env
chown root:root /opt/power-clean/.env
```

---

## 10. Docker & Container-Sicherheit

### Non-root User

```dockerfile
# Beide Container (API + Frontend) laufen nicht als root
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup
USER appuser
```

### Netzwerk-Isolation

```yaml
networks:
  traefik-proxy:
    external: true   # Öffentlich (Traefik-Routing)
  internal:
    internal: true   # Kein Internet-Zugriff (Datenbank, CMS intern)
```

```yaml
# PostgreSQL — NUR internes Netz, keine exponierten Ports!
postgres:
  networks:
    - internal
  # Kein 'ports:' Block!
```

### Dependency Scanning (npm + NuGet)

```yaml
# .github/workflows/deploy.yml — vor dem Build
- name: npm audit
  working-directory: ./frontend
  run: npm audit --audit-level=high

- name: NuGet audit
  working-directory: ./backend
  run: dotnet list package --vulnerable --include-transitive
```

Zusätzlich **GitHub Dependabot** aktivieren (`.github/dependabot.yml`):

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /frontend
    schedule:
      interval: weekly
  - package-ecosystem: nuget
    directory: /backend
    schedule:
      interval: weekly
  - package-ecosystem: docker
    directory: /
    schedule:
      interval: weekly
```

Dependabot öffnet automatisch Pull Requests bei veralteten/verwundbaren Paketen.

### Image-Vulnerability-Scan (CI/CD)

```yaml
# .github/workflows/deploy.yml
- name: Scan API Image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: riksorax/power-clean-api:latest
    severity: CRITICAL,HIGH
    exit-code: 1    # Pipeline schlägt bei kritischen CVEs fehl

- name: Scan Frontend Image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: riksorax/power-clean-frontend:latest
    severity: CRITICAL,HIGH
    exit-code: 1
```

---

## 11. Server-Härtung (Hetzner VPS)

### SSH

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 2222
MaxAuthTries 3
```

### Firewall (ufw)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 2222/tcp   # SSH
ufw allow 80/tcp     # HTTP (Traefik)
ufw allow 443/tcp    # HTTPS (Traefik)
ufw enable
```

### Automatische Security-Updates

```bash
apt install unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 12. DSGVO-Compliance

| Maßnahme | Status |
|----------|--------|
| Datenschutzerklärung | ✅ vorhanden (anpassen: Firebase erwähnen) |
| Cookie-Consent (CCM19) | ✅ |
| Google Analytics nur nach Consent | ✅ |
| HTTPS überall | ✅ |
| Server in DE (Hetzner) | ✅ |
| Firebase Region: `europe-west3` (Frankfurt) | ⚠️ beim Projekt-Setup einstellen |
| Google Cloud DPA (Auftragsverarbeitungsvertrag) | ⚠️ abschließen |
| Kontaktformular → nur E-Mail (kein Cloud-Storage personenbez. Daten) | ✅ |
| Impressum | ✅ vorhanden |

---

## Go-Live Sicherheits-Checkliste

### Infrastruktur
- [ ] TLS 1.2+ erzwungen, TLS 1.0/1.1 deaktiviert
- [ ] HSTS Header aktiv (inkl. preload)
- [ ] SSH: Root-Login und Passwort-Auth deaktiviert
- [ ] Firewall: nur Port 80, 443 und SSH offen
- [ ] Automatische Security-Updates aktiviert
- [ ] Docker Images auf Vulnerabilities gescannt (Trivy)
- [ ] GitHub Dependabot aktiviert (npm, NuGet, Docker)
- [ ] `npm audit` und `dotnet list package --vulnerable` ohne HIGH/CRITICAL

### Backend (.NET API)
- [ ] CORS auf `https://powercleanniederrhein.de` beschränkt
- [ ] Rate Limiting auf `/api/contact` aktiv (3 Req / 10 Min)
- [ ] `UniversalCms__ApiKey` nur als Secret gesetzt, nie im Repo
- [ ] Input-Validierung und HTML-Encoding aktiv
- [ ] Kein eigenes SQL — keine eigene Datenbank in diesem Repo
- [ ] JSON-Dateipfade nie aus User-Input zusammengesetzt (Path Traversal)
- [ ] Server-Header entfernt
- [ ] Non-root Docker-User
- [ ] Health-Endpunkt gibt keine internen Infos preis
- [ ] Swagger UI in Production deaktiviert

### Frontend (Next.js)
- [ ] CSP Header gesetzt
- [ ] Security-Header vollständig
- [ ] `NEXT_PUBLIC_*` enthält keine sensiblen Daten
- [ ] Kein API-Key im Client-Code (nur server-seitig via `.NET API`)
- [ ] Error Boundaries für alle kritischen Sections vorhanden

### universal-cms (externes Projekt)
- [ ] API-Key nur mit Lese-Zugriff auf Delivery-API im .NET API hinterlegt
- [ ] Vanity-Domain/Projekt-Zugriff im CMS-Admin korrekt beschränkt
- [ ] Details siehe Sicherheitsdoku des universal-cms-Repos selbst

### DSGVO
- [ ] Datenschutzerklärung: universal-cms/Firebase (Auth + Storage, kein Firestore für
      Kontaktanfragen) erwähnt
- [ ] Cookie-Consent (CCM19) aktualisiert und getestet
- [ ] Google Analytics feuert erst nach Consent
