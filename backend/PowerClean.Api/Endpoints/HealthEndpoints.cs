namespace PowerClean.Api.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this WebApplication app)
    {
        app.MapGet("/health", () => Results.Ok(new { status = "healthy", version = "1.0.0" }))
            .WithName("Health")
            .WithTags("System")
            .AllowAnonymous();
    }
}
