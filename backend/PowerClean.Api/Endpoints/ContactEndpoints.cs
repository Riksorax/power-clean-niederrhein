using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using PowerClean.Api.Models;
using PowerClean.Api.Services;

namespace PowerClean.Api.Endpoints;

public static class ContactEndpoints
{
    public static void MapContactEndpoints(this WebApplication app)
    {
        app.MapPost("/api/contact", async (
            [FromBody] ContactFormModel model,
            IEmailService emailService,
            ILogger<Program> logger) =>
        {
            var results = new List<ValidationResult>();
            if (!Validator.TryValidateObject(model, new ValidationContext(model), results, true))
            {
                var errors = results
                    .GroupBy(r => r.MemberNames.FirstOrDefault() ?? "general")
                    .ToDictionary(g => g.Key, g => g.Select(r => r.ErrorMessage ?? "").ToArray());
                return Results.ValidationProblem(errors);
            }

            if (!model.PrivacyAccepted)
                return Results.BadRequest(new { error = "Datenschutz muss akzeptiert werden." });

            await emailService.SendEmailAsync(model);
            return Results.Ok(new { success = true });
        })
        .WithName("SendContact")
        .WithTags("Contact")
        .RequireRateLimiting("contact");
    }
}
