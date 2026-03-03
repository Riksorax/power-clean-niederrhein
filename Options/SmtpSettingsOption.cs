namespace PowerCleanNiederrhein.Options;

public class SmtpSettingsOption
{
    public const string Smtp = "SmtpSettings"; // Konstante für den Konfigurationsabschnitt

    public string? Host { get; set; }
    public string? Port { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? FromEmail { get; set; }
    public string? ToEmail { get; set; }
}