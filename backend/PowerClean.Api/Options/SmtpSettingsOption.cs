namespace PowerClean.Api.Options;

public class SmtpSettingsOption
{
    public const string Section = "SmtpSettings";

    public string? Host { get; set; }
    public string? Port { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? FromEmail { get; set; }
    public string? ToEmail { get; set; }
}
