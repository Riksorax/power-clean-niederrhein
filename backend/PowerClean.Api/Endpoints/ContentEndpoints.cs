using PowerClean.Api.Services;

namespace PowerClean.Api.Endpoints;

public static class ContentEndpoints
{
    public static void MapContentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api").WithTags("Content");

        group.MapGet("/services", async (IContentService content) =>
            Results.Ok(await content.GetServicesAsync()))
            .WithName("GetServices")
            .CacheOutput(p => p.Expire(TimeSpan.FromMinutes(10)));

        group.MapGet("/pricing", async (IContentService content) =>
            Results.Ok(await content.GetPricingAsync()))
            .WithName("GetPricing")
            .CacheOutput(p => p.Expire(TimeSpan.FromMinutes(10)));

        group.MapGet("/testimonials", async (IContentService content) =>
            Results.Ok(await content.GetTestimonialsAsync()))
            .WithName("GetTestimonials")
            .CacheOutput(p => p.Expire(TimeSpan.FromMinutes(10)));
    }
}
