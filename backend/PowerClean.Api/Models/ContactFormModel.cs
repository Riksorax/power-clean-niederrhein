using System.ComponentModel.DataAnnotations;

namespace PowerClean.Api.Models;

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
                   "Hausfassade", "Sonstiges")]
    public string Service { get; init; } = "";

    [Required, MinLength(10), MaxLength(2000)]
    public string Message { get; init; } = "";

    [Range(typeof(bool), "true", "true")]
    public bool PrivacyAccepted { get; init; }
}
