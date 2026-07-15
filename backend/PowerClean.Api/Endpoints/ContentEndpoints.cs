using PowerClean.Api.Services;

namespace PowerClean.Api.Endpoints;

public static class ContentEndpoints
{
    public static void MapContentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api").WithTags("Content");

        // Kein .CacheOutput() hier - führte in Produktion zu vereinzelten, für 10 Minuten
        // festhängenden 404-Antworten (Output-Cache hat offenbar auch eine nicht-2xx-Antwort
        // aus einer frühen Anfrage direkt nach Container-Start zwischengespeichert). Next.js'
        // eigenes ISR-Caching auf Frontend-Seite (fetchApi, revalidate: 600) übernimmt die
        // Zwischenspeicherung bereits ausreichend.
        group.MapGet("/services", async (IContentService content) =>
            Results.Ok(await content.GetServicesAsync()))
            .WithName("GetServices");

        group.MapGet("/pricing", async (IContentService content) =>
            Results.Ok(await content.GetPricingAsync()))
            .WithName("GetPricing");

        group.MapGet("/testimonials", async (IContentService content) =>
            Results.Ok(await content.GetTestimonialsAsync()))
            .WithName("GetTestimonials");
    }
}
