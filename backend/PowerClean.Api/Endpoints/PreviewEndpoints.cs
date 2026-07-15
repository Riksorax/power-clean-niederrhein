using Microsoft.Extensions.Options;
using PowerClean.Api.Options;

namespace PowerClean.Api.Endpoints;

public static class PreviewEndpoints
{
    // Reiner Durchreiche-Endpunkt zum CMS - das Frontend spricht nie direkt mit externen
    // Diensten, siehe docs/ARCHITECTURE.md.
    public static void MapPreviewEndpoints(this WebApplication app)
    {
        app.MapGet("/api/preview/{token}", async (string token, IHttpClientFactory httpFactory, IOptions<UniversalCmsOptions> options) =>
        {
            if (string.IsNullOrWhiteSpace(options.Value.BaseUrl))
                return Results.NotFound();

            var http = httpFactory.CreateClient("UniversalCmsPreview");
            var response = await http.GetAsync($"/api/preview/{token}");
            var body = await response.Content.ReadAsStringAsync();
            return Results.Content(body, "application/json", statusCode: (int)response.StatusCode);
        }).WithTags("Preview");
    }
}
