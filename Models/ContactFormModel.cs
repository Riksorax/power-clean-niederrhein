using System.ComponentModel.DataAnnotations;

namespace PowerCleanNiederrhein.Models;

public class ContactFormModel
{
    [Required(ErrorMessage = "Bitte geben Sie Ihren Namen ein.")]
    [StringLength(100, ErrorMessage = "Der Name ist zu lang.")]
    public string? Name { get; set; }

    [Required(ErrorMessage = "Bitte geben Sie Ihre E-Mail-Adresse ein.")]
    [EmailAddress(ErrorMessage = "Bitte geben Sie eine gültige E-Mail-Adresse ein.")]
    public string? Email { get; set; }

    public string? Phone { get; set; }

    [Required(ErrorMessage = "Bitte wählen Sie eine Leistung aus.")]
    public string Service { get; set; } = "";

    [Required(ErrorMessage = "Bitte geben Sie Ihre Nachricht ein.")]
    [StringLength(2000, ErrorMessage = "Die Nachricht ist zu lang (max. 2000 Zeichen).")]
    public string? Message { get; set; }

    [Range(typeof(bool), "true", "true", ErrorMessage = "Sie müssen die Datenschutzerklärung akzeptieren.")]
    public bool AcceptPrivacy { get; set; }
}