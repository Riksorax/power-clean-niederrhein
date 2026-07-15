# Backend — .NET Minimal API

## Status

Phase 1 ist vollständig implementiert und baut fehlerfrei.

---

## Ziel

Schlanke, zustandslose REST API als zentrale Backend-Schicht:
- Liefert öffentliche Inhalte aus (JSON-Dateien lokal, universal-cms in Produktion — siehe `docs/CMS.md`)
- Verarbeitet Kontaktformulare (sendet E-Mail via SMTP — 1:1 aus Blazor übernommen)
- Proxied Live-Vorschau-Anfragen ans CMS (`GET /api/preview/{token}`)
- Kapselt alle externen Dienste — Frontend spricht nie direkt mit universal-cms

Admin-Login und Content-Pflege laufen komplett über universal-cms' eigenes, separates
Admin-Panel (`cms.webappniederrhein.de`) — dieses Backend braucht dafür keine eigene
Firebase-Anbindung, kein `/admin`-Bereich und keine eigene JWT-Validierung.

---

## Projektstruktur

```
backend/
├── PowerClean.Api/
│   ├── Endpoints/
│   │   ├── ContentEndpoints.cs     ← GET /api/services, /api/pricing, /api/testimonials
│   │   ├── ContactEndpoints.cs     ← POST /api/contact (Rate Limiting)
│   │   ├── HealthEndpoints.cs      ← GET /health
│   │   └── PreviewEndpoints.cs     ← GET /api/preview/{token} (Proxy zu universal-cms)
│   ├── Models/
│   │   ├── ServiceModel.cs
│   │   ├── PricingModel.cs
│   │   ├── TestimonialModel.cs
│   │   └── ContactFormModel.cs
│   ├── Services/
│   │   ├── IEmailService.cs
│   │   ├── EmailService.cs               ← 1:1 aus Blazor migriert (HtmlEncoder ergänzt)
│   │   ├── IContentService.cs            ← Abstraktion (JSON lokal, universal-cms produktiv)
│   │   ├── JsonContentService.cs         ← Fallback ohne CMS-Zugang (z.B. lokale Entwicklung)
│   │   └── UniversalCmsContentService.cs ← Delivery-API-Anbindung (aktiv, siehe docs/CMS.md)
│   ├── Options/
│   │   ├── SmtpSettingsOption.cs
│   │   └── UniversalCmsOptions.cs
│   ├── data/                       ← Phase 1: JSON-Datenhaltung
│   │   ├── services.json           ← 6 Leistungen (aus Blazor migriert)
│   │   ├── pricing.json            ← 6 Zusatzleistungen (aus Blazor migriert)
│   │   └── testimonials.json       ← 3 Testimonials (aus Blazor migriert)
│   ├── templates/
│   │   └── mail/empfangMail.html   ← E-Mail-Template (aus wwwroot migriert)
│   ├── Program.cs
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   └── Dockerfile
└── PowerClean.Api.sln
```

---

## API-Endpunkte (Phase 1 — implementiert)

### Öffentliche Endpunkte (kein Auth)

```
GET  /api/services         → Liste aller Leistungen (aus services.json)
GET  /api/pricing          → Preistabelle (aus pricing.json)
GET  /api/testimonials     → Kundenstimmen (aus testimonials.json)
POST /api/contact          → Kontaktformular → SMTP E-Mail (kein Firestore!)
GET  /health               → Health Check
```

Alle Content-Endpunkte haben Output-Cache (10 Min) aktiviert.

### Admin-Endpunkte (Phase 3 — geplant)

```
GET  /api/admin/cache/revalidate  → ISR-Cache manuell leeren
```

---

## Program.cs (aktueller Stand)

```csharp
var builder = WebApplication.CreateBuilder(args);

// CORS
builder.Services.AddCors(opt =>
    opt.AddPolicy("Frontend", p =>
        p.WithOrigins(builder.Configuration["AllowedOrigins"]!.Split(','))
         .WithMethods("GET", "POST")
         .WithHeaders("Content-Type", "Authorization")));

// Services
builder.Services.Configure<SmtpSettingsOption>(
    builder.Configuration.GetSection(SmtpSettingsOption.Section));
builder.Services.AddScoped<IEmailService, EmailService>();
// UniversalCms:BaseUrl gesetzt (appsettings.json) → live vom CMS, sonst JSON-Fallback (siehe Program.cs)

// Rate Limiting (Kontaktformular: 3 Anfragen / 10 Minuten)
builder.Services.AddRateLimiter(opt =>
{
    opt.AddFixedWindowLimiter("contact", o =>
    {
        o.PermitLimit = 3;
        o.Window      = TimeSpan.FromMinutes(10);
        o.QueueLimit  = 0;
    });
    opt.RejectionStatusCode = 429;
    opt.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.Headers.RetryAfter = "60";
        await ctx.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Zu viele Anfragen. Bitte 60 Sekunden warten." }, ct);
    };
});

// Output Cache (10 Min für Content-Endpunkte)
builder.Services.AddOutputCache();

// Swagger (nur Development)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Einheitliche Fehlerbehandlung
builder.Services.AddProblemDetails();

var app = builder.Build();

// Security Headers
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.Remove("Server");
    ctx.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    ctx.Response.Headers.Append("X-Frame-Options", "DENY");
    ctx.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseExceptionHandler(err => err.Run(async ctx =>
{
    ctx.Response.StatusCode  = 500;
    ctx.Response.ContentType = "application/json";
    await ctx.Response.WriteAsJsonAsync(new { error = "Ein interner Fehler ist aufgetreten." });
}));

if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }

app.UseCors("Frontend");
app.UseRateLimiter();
app.UseOutputCache();

app.MapContentEndpoints();
app.MapContactEndpoints();
app.MapHealthEndpoints();

app.Run();
```

---

## Kontaktformular-Modell

```csharp
// Models/ContactFormModel.cs
public record ContactFormModel
{
    [Required, MinLength(2), MaxLength(100)]
    public string Name { get; init; } = "";
    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; init; } = "";
    [MaxLength(30)]
    public string? Phone { get; init; }
    [Required]
    [AllowedValues("Terrassenreinigung", "Gehwegreinigung", "Balkonreinigung",
                   "Auffahrtreinigung", "Parkplatzreinigung", "Winterdienst",
                   "Sonstiges")]
    public string Service { get; init; } = "";
    [Required, MinLength(10), MaxLength(2000)]
    public string Message { get; init; } = "";
    [Range(typeof(bool), "true", "true")]
    public bool PrivacyAccepted { get; init; }
}
```

---

## EmailService (1:1 aus Blazor migriert)

```csharp
// Services/EmailService.cs — Wichtigste Ergänzung: HtmlEncoder (XSS-Schutz)
body = body
    .Replace("{{Name}}",      HtmlEncoder.Default.Encode(contact.Name))
    .Replace("{{Email}}",     HtmlEncoder.Default.Encode(contact.Email))
    .Replace("{{Nachricht}}", HtmlEncoder.Default.Encode(contact.Message));
```

Daten kommen **nur per E-Mail** an — kein Firestore, keine Datenbank.

---

## IContentService Interface

```csharp
// Services/IContentService.cs
public interface IContentService
{
    Task<IEnumerable<ServiceModel>>     GetServicesAsync();
    Task<IEnumerable<PricingModel>>     GetPricingAsync();
    Task<IEnumerable<TestimonialModel>> GetTestimonialsAsync();
}
```

Welche Implementierung aktiv ist, entscheidet sich in `Program.cs` allein danran, ob
`UniversalCms:BaseUrl` konfiguriert ist (siehe `docs/CMS.md`) — kein Code-Wechsel nötig.

---

## UniversalCmsContentService (aktiv)

```csharp
// Services/UniversalCmsContentService.cs (gekürzt)
public class UniversalCmsContentService(HttpClient http, IOptions<UniversalCmsOptions> options) : IContentService
{
    public async Task<IEnumerable<ServiceModel>> GetServicesAsync()
    {
        var entries = await FetchAsync<ServiceFields>("leistungen"); // GET /delivery/{slug}/leistungen?sort=sort
        return entries.Select(e => new ServiceModel(e.Id, e.Data.Title, e.Data.Description,
            e.Data.ImageUrl, e.Data.AltText, e.Data.Sort));
    }
    // GetPricingAsync/GetTestimonialsAsync analog gegen "preise"/"erfolge"
}
```

Der `HttpClient` schickt `x-api-key` als Default-Header (aus `UniversalCms:ApiKey`) und hat
die CMS-`BaseUrl` als `BaseAddress` — siehe `docs/CMS.md` für die vollständige Feld-Zuordnung
und Collection-Namen im CMS.

---

## Preview-Proxy

```csharp
// Endpoints/PreviewEndpoints.cs
app.MapGet("/api/preview/{token}", async (string token, IHttpClientFactory httpFactory, ...) =>
{
    var http = httpFactory.CreateClient("UniversalCmsPreview");
    var response = await http.GetAsync($"/api/preview/{token}");
    var body = await response.Content.ReadAsStringAsync();
    return Results.Content(body, "application/json", statusCode: (int)response.StatusCode);
});
```

Reiner Durchreiche-Endpunkt — das Frontend ruft nur diesen eigenen Endpunkt auf, nie
universal-cms direkt. Details zum Ablauf: `docs/CMS.md`.

---

## Umgebungsvariablen

| Variable | Beschreibung | Geheim |
|----------|-------------|--------|
| `SmtpSettings__Host` | SMTP-Server | ✅ |
| `SmtpSettings__Port` | SMTP-Port | |
| `SmtpSettings__Username` | SMTP-User | ✅ |
| `SmtpSettings__Password` | SMTP-Passwort | ✅ |
| `SmtpSettings__FromEmail` | Absender | |
| `SmtpSettings__ToEmail` | Empfänger | |
| `AllowedOrigins` | CORS-Whitelist (kommagetrennt) | |
| `UniversalCms__BaseUrl` | CMS-Basis-URL (`https://cms.webappniederrhein.de`) | |
| `UniversalCms__ApiKey` | API-Key des Projekts im CMS | ✅ |
| `UniversalCms__ProjectSlug` | Projekt-Slug im CMS (`powercleanniederrhein`) | |

---

## Lokale SMTP-Konfiguration (User Secrets)

```bash
cd backend/PowerClean.Api
dotnet user-secrets set "SmtpSettings:Host" "mail.example.com"
dotnet user-secrets set "SmtpSettings:Port" "587"
dotnet user-secrets set "SmtpSettings:Username" "info@powercleanniederrhein.de"
dotnet user-secrets set "SmtpSettings:Password" "geheim"
dotnet user-secrets set "SmtpSettings:FromEmail" "info@powercleanniederrhein.de"
dotnet user-secrets set "SmtpSettings:ToEmail" "info@powercleanniederrhein.de"
dotnet user-secrets set "AllowedOrigins" "http://localhost:3000"
```

---

## Swagger / OpenAPI

Nur in `Development` aktiv:  
`→ http://localhost:5000/swagger`

---

## Dockerfile

```dockerfile
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
