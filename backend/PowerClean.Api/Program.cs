using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using PowerClean.Api.Endpoints;
using PowerClean.Api.Options;
using PowerClean.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt =>
    opt.AddPolicy("Frontend", p =>
        p.WithOrigins(builder.Configuration["AllowedOrigins"]!.Split(','))
         .WithMethods("GET", "POST")
         .WithHeaders("Content-Type", "Authorization")));

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.Configure<SmtpSettingsOption>(
    builder.Configuration.GetSection(SmtpSettingsOption.Section));
builder.Services.Configure<UniversalCmsOptions>(
    builder.Configuration.GetSection(UniversalCmsOptions.Section));

builder.Services.AddScoped<IEmailService, EmailService>();

// Ist eine CMS-Basis-URL konfiguriert (siehe UniversalCms-Sektion in appsettings), werden Inhalte
// live vom universal-cms geladen - sonst (z.B. lokale Entwicklung ohne CMS-Zugang) aus den
// JSON-Dateien unter data/.
var cmsBaseUrl = builder.Configuration[$"{UniversalCmsOptions.Section}:BaseUrl"];
if (!string.IsNullOrWhiteSpace(cmsBaseUrl))
{
    builder.Services.AddHttpClient<IContentService, UniversalCmsContentService>((sp, http) =>
    {
        var cms = sp.GetRequiredService<IOptions<UniversalCmsOptions>>().Value;
        http.BaseAddress = new Uri(cms.BaseUrl!);
        if (!string.IsNullOrWhiteSpace(cms.ApiKey))
            http.DefaultRequestHeaders.Add("x-api-key", cms.ApiKey);
    });
}
else
{
    builder.Services.AddScoped<IContentService, JsonContentService>();
}

// Eigener Client für den Preview-Proxy (siehe PreviewEndpoints) - unabhängig davon, welcher
// IContentService gerade aktiv ist, damit die Vorschau auch während einer lokalen JSON-Entwicklung
// gegen ein Test-Projekt im CMS funktioniert.
builder.Services.AddHttpClient("UniversalCmsPreview", (sp, http) =>
{
    var cms = sp.GetRequiredService<IOptions<UniversalCmsOptions>>().Value;
    http.BaseAddress = new Uri(cms.BaseUrl ?? "http://localhost");
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
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

// ── Output Cache ──────────────────────────────────────────────────────────────
builder.Services.AddOutputCache();

// ── Swagger (nur Development) ─────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── Fehlerbehandlung ──────────────────────────────────────────────────────────
builder.Services.AddProblemDetails();

var app = builder.Build();

// ── Security Header Middleware ────────────────────────────────────────────────
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseRateLimiter();
app.UseOutputCache();

// ── Endpoints ─────────────────────────────────────────────────────────────────
app.MapContentEndpoints();
app.MapContactEndpoints();
app.MapHealthEndpoints();
app.MapPreviewEndpoints();

app.Run();
