# Backend — .NET Minimal API

## Ziel

Schlanke, zustandslose REST API als zentrale Backend-Schicht:
- Liefert öffentliche Inhalte aus (liest aus Directus)
- Verarbeitet Kontaktformulare (sendet E-Mail via SMTP — unverändert aus Blazor)
- Validiert Firebase JWT-Tokens für geschützte Admin-Endpunkte
- Kapselt alle externen Dienste (Directus, Firebase) — Frontend spricht nie direkt mit Directus

---

## Projektstruktur

```
backend/
├── PowerClean.Api/
│   ├── Endpoints/
│   │   ├── ServicesEndpoints.cs        ← GET  /api/services
│   │   ├── PricingEndpoints.cs         ← GET  /api/pricing
│   │   ├── TestimonialsEndpoints.cs    ← GET  /api/testimonials
│   │   ├── ContactEndpoints.cs         ← POST /api/contact
│   │   └── AdminEndpoints.cs           ← GET/POST /api/admin/* (JWT-geschützt)
│   ├── Models/
│   │   ├── ServiceModel.cs
│   │   ├── PricingModel.cs
│   │   ├── TestimonialModel.cs
│   │   └── ContactFormModel.cs
│   ├── Services/
│   │   ├── IEmailService.cs
│   │   ├── EmailService.cs             ← 1:1 aus Blazor migriert (SMTP, unverändert)
│   │   ├── IContentService.cs          ← Abstraktion (Phase 1: JSON, Phase 4: Directus)
│   │   ├── JsonContentService.cs       ← Phase 1
│   │   └── DirectusContentService.cs   ← Phase 4
│   ├── Auth/
│   │   └── FirebaseAuthHandler.cs      ← JWT-Validierung via Firebase Admin SDK
│   ├── Options/
│   │   ├── SmtpSettingsOption.cs
│   │   ├── DirectusOptions.cs
│   │   └── FirebaseOptions.cs
│   ├── Middleware/
│   │   └── RequestLoggingMiddleware.cs
│   ├── data/                           ← Phase 1: JSON-Dateien
│   │   ├── services.json
│   │   ├── pricing.json
│   │   └── testimonials.json
│   ├── templates/
│   │   └── mail/empfangMail.html
│   ├── Program.cs
│   ├── appsettings.json
│   └── Dockerfile
└── PowerClean.Api.sln
```

---

## API-Endpunkte

### Öffentliche Endpunkte (kein Auth)

```
GET  /api/services         → Liste aller Leistungen (aus Directus)
GET  /api/pricing          → Preistabelle (aus Directus)
GET  /api/testimonials     → Kundenstimmen (aus Directus)
POST /api/contact          → Kontaktformular (→ Firestore + E-Mail)
GET  /health               → Health Check
```

### Admin-Endpunkte (Firebase JWT erforderlich)

```
GET  /api/admin/cache/revalidate  → ISR-Cache manuell leeren
```

---

## Firebase JWT-Validierung

```csharp
// Auth/FirebaseAuthHandler.cs
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;

public static class FirebaseAuthExtensions
{
    public static IServiceCollection AddFirebaseAuth(
        this IServiceCollection services, IConfiguration config)
    {
        // Firebase Admin SDK initialisieren
        if (FirebaseApp.DefaultInstance == null)
        {
            FirebaseApp.Create(new AppOptions
            {
                Credential = GoogleCredential.FromJson(
                    config["Firebase:ServiceAccountJson"]),
            });
        }

        services.AddAuthentication("Firebase")
            .AddScheme<AuthenticationSchemeOptions, FirebaseAuthHandler>(
                "Firebase", null);

        return services;
    }
}

public class FirebaseAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            return AuthenticateResult.Fail("Kein Authorization-Header");

        var token = authHeader.ToString().Replace("Bearer ", "");

        try
        {
            var decoded = await FirebaseAuth.DefaultInstance
                .VerifyIdTokenAsync(token);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, decoded.Uid),
                new Claim(ClaimTypes.Email, decoded.Claims
                    .GetValueOrDefault("email")?.ToString() ?? ""),
            };
            var identity  = new ClaimsIdentity(claims, "Firebase");
            var principal = new ClaimsPrincipal(identity);
            var ticket    = new AuthenticationTicket(principal, "Firebase");

            return AuthenticateResult.Success(ticket);
        }
        catch (FirebaseAuthException ex)
        {
            return AuthenticateResult.Fail($"Ungültiger Token: {ex.Message}");
        }
    }
}
```

---

## Kontaktformular → E-Mail (unverändert aus Blazor)

Der bestehende `EmailService` wird **1:1 übernommen** — kein neues System, keine Datenbank.

```csharp
// Endpoints/ContactEndpoints.cs
app.MapPost("/api/contact", async (
    [FromBody] ContactFormModel model,
    IEmailService emailService,
    ILogger<Program> logger) =>
{
    await emailService.SendAsync(model);
    logger.LogInformation("Kontaktanfrage von {Email} gesendet", model.Email);
    return Results.Ok(new { success = true });
})
.RequireRateLimiting("contact");
```

Migration aus Blazor:
1. `Services/EmailService.cs` → `backend/PowerClean.Api/Services/EmailService.cs` kopieren
2. `Options/SmtpSettingsOption.cs` ebenfalls kopieren
3. `wwwroot/templates/mail/empfangMail.html` → `backend/templates/mail/` verschieben
4. Namespace anpassen: `PowerClean.Api.Services`

---

## Directus Content Service

```csharp
// Services/DirectusContentService.cs
public class DirectusContentService(HttpClient http) : IContentService
{
    public async Task<IEnumerable<ServiceModel>> GetServicesAsync()
    {
        var response = await http.GetFromJsonAsync<DirectusListResponse<ServiceModel>>(
            "items/services?filter[status][_eq]=published&sort=sort");
        return response?.Data ?? [];
    }

    public async Task<IEnumerable<PricingModel>> GetPricingAsync()
    {
        var response = await http.GetFromJsonAsync<DirectusListResponse<PricingModel>>(
            "items/pricing?filter[status][_eq]=published&sort=sort");
        return response?.Data ?? [];
    }
}

// Wrapper für Directus-Antwortformat
record DirectusListResponse<T>(
    [property: JsonPropertyName("data")] IEnumerable<T> Data
);
```

---

## Program.cs

```csharp
var builder = WebApplication.CreateBuilder(args);

// CORS
builder.Services.AddCors(opt =>
    opt.AddPolicy("Frontend", p =>
        p.WithOrigins(builder.Configuration["AllowedOrigins"]!.Split(','))
         .WithMethods("GET", "POST", "PUT")
         .WithHeaders("Content-Type", "Authorization")));

// Firebase Auth
builder.Services.AddFirebaseAuth(builder.Configuration);
builder.Services.AddAuthorization();

// Services
builder.Services.Configure<SmtpSettingsOption>(
    builder.Configuration.GetSection("SmtpSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();

// Phase 1: JSON | Phase 4: Directus
builder.Services.AddScoped<IContentService, JsonContentService>();
// builder.Services.AddScoped<IContentService, DirectusContentService>();

// Directus HTTP Client (Phase 4)
builder.Services.AddHttpClient<DirectusContentService>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["Directus:BaseUrl"]!);
    client.DefaultRequestHeaders.Add(
        "Authorization", $"Bearer {builder.Configuration["Directus:Token"]}");
    // Timeout: wenn Directus nicht antwortet → Next.js error.tsx greift
    client.Timeout = TimeSpan.FromSeconds(5);
});

// Rate Limiting
builder.Services.AddRateLimiter(opt =>
{
    opt.AddFixedWindowLimiter("contact", o =>
    {
        o.PermitLimit = 3;
        o.Window      = TimeSpan.FromMinutes(10);
    });
    opt.RejectionStatusCode = 429;
});

// Output Cache (für public endpoints)
builder.Services.AddOutputCache(opt =>
    opt.AddBasePolicy(p => p.Expire(TimeSpan.FromMinutes(10))));

var app = builder.Build();

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseOutputCache();

app.MapServicesEndpoints();
app.MapPricingEndpoints();
app.MapTestimonialsEndpoints();
app.MapContactEndpoints();
app.MapAdminEndpoints();
app.MapHealthChecks("/health");

app.Run();
```

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
| `AllowedOrigins` | CORS-Whitelist | |
| `Firebase__ProjectId` | Firebase Projekt-ID | |
| `Firebase__ServiceAccountJson` | Service Account JSON (für JWT-Validierung) | ✅ |
| `Directus__BaseUrl` | Directus intern URL | |
| `Directus__Token` | Directus API-Token | ✅ |

---

## Swagger / OpenAPI

```csharp
// Program.cs
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(opt =>
{
    opt.SwaggerDoc("v1", new() { Title = "Power Clean API", Version = "v1" });
    // Bearer Token für geschützte Endpunkte
    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In   = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        Description = "Firebase ID Token"
    });
});

// Nur in Development aktiv — nie in Production exponieren
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // → http://localhost:5000/swagger
}
```

---

## Fehlerbehandlung (Global)

```csharp
// Program.cs — einheitliches Fehlerformat
app.UseExceptionHandler(err => err.Run(async ctx =>
{
    ctx.Response.StatusCode  = 500;
    ctx.Response.ContentType = "application/json";
    await ctx.Response.WriteAsJsonAsync(new
    {
        error   = "Ein interner Fehler ist aufgetreten.",
        traceId = Activity.Current?.Id
    });
}));

// Einheitliches Validation-Fehlerformat (422)
// Alle Endpoint-Validierungsfehler geben zurück:
// { "errors": { "email": ["Ungültige E-Mail-Adresse"] } }
```

---

## NuGet-Pakete

```xml
<PackageReference Include="FirebaseAdmin" Version="3.*" />
<PackageReference Include="Microsoft.AspNetCore.Authentication" Version="9.*" />
<PackageReference Include="Microsoft.Extensions.Http" Version="9.*" />
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="9.*" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="7.*" />
```
