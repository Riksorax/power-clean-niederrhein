using System.Net;
using System.Net.Mail;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;
using PowerClean.Api.Models;
using PowerClean.Api.Options;

namespace PowerClean.Api.Services;

public class EmailService(
    IOptions<SmtpSettingsOption> smtpOptions,
    IWebHostEnvironment env,
    ILogger<EmailService> logger) : IEmailService
{
    public async Task SendEmailAsync(ContactFormModel contact)
    {
        var cfg = smtpOptions.Value;

        if (string.IsNullOrEmpty(cfg.Host) || string.IsNullOrEmpty(cfg.Username) ||
            string.IsNullOrEmpty(cfg.Password) || string.IsNullOrEmpty(cfg.FromEmail) ||
            string.IsNullOrEmpty(cfg.ToEmail))
        {
            throw new InvalidOperationException("SMTP-Einstellungen sind nicht vollständig konfiguriert.");
        }

        if (!int.TryParse(cfg.Port, out var port))
            port = 587;

        var templatePath = Path.Combine(env.ContentRootPath, "templates", "mail", "empfangMail.html");

        if (!File.Exists(templatePath))
            throw new FileNotFoundException($"E-Mail-Template nicht gefunden: {templatePath}");

        var body = await File.ReadAllTextAsync(templatePath);

        // HTML-Encoding gegen XSS in E-Mails
        body = body
            .Replace("{{Name}}",      HtmlEncoder.Default.Encode(contact.Name))
            .Replace("{{Email}}",     HtmlEncoder.Default.Encode(contact.Email))
            .Replace("{{Nachricht}}", HtmlEncoder.Default.Encode(contact.Message));

        using var client = new SmtpClient(cfg.Host, port)
        {
            EnableSsl   = true,
            Credentials = new NetworkCredential(cfg.Username, cfg.Password)
        };

        var mail = new MailMessage
        {
            From        = new MailAddress(cfg.FromEmail, "Power Clean Niederrhein"),
            Subject     = $"Neue Kontaktanfrage von {HtmlEncoder.Default.Encode(contact.Name)}",
            Body        = body,
            IsBodyHtml  = true,
        };
        mail.To.Add(cfg.ToEmail);
        mail.ReplyToList.Add(new MailAddress(contact.Email, contact.Name));

        await client.SendMailAsync(mail);
        logger.LogInformation("Kontaktanfrage von {Email} erfolgreich gesendet", contact.Email);
    }
}
