using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using PowerCleanNiederrhein.Models;
using PowerCleanNiederrhein.Options;

namespace PowerCleanNiederrhein.Services;

public class EmailService(IOptions<SmtpSettingsOption> smtpSettingsOption, IWebHostEnvironment environment) : IEmailService
{
    public async Task SendEmailAsync(ContactFormModel contact)
    {
        var smtpHost = smtpSettingsOption.Value.Host;
        var smtpPortString = smtpSettingsOption.Value.Port;
        if (!int.TryParse(smtpPortString, out var smtpPort))
        {
            smtpPort = 587;
        }
        var smtpUser =smtpSettingsOption.Value.Username;
        var smtpPass = smtpSettingsOption.Value.Password;
        var fromEmail = smtpSettingsOption.Value.FromEmail;
        var toEmail = smtpSettingsOption.Value.ToEmail;

        if (string.IsNullOrEmpty(smtpHost) || string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass) || string.IsNullOrEmpty(fromEmail) || string.IsNullOrEmpty(toEmail))
        {
            throw new InvalidOperationException("SMTP-Einstellungen sind in der Konfiguration nicht vollständig.");
        }
        
        var templatePath = Path.Combine(environment.WebRootPath, "templates/mail", "empfangMail.html");
        
        if (!File.Exists(templatePath))
        {
            throw new FileNotFoundException($"E-Mail-Template nicht gefunden unter: {templatePath}");
        }
        
        var emailBody = await File.ReadAllTextAsync(templatePath);

        emailBody = emailBody.Replace("{{Name}}", contact.Name);
        emailBody = emailBody.Replace("{{Email}}", contact.Email);
        emailBody = emailBody.Replace("{{Nachricht}}", contact.Message); // Achten Sie darauf, dass der Platzhalter genau so im HTML ist
        
        using var client = new SmtpClient(smtpHost, smtpPort);
        client.EnableSsl = true;
        client.Credentials = new NetworkCredential(smtpUser, smtpPass);


        var mailMessage = new MailMessage
        {
            From = new MailAddress(fromEmail, "noreply"),
            Subject = $"Neue Kontaktanfrage von {contact.Name}",
            Body = emailBody,
            IsBodyHtml = true,
        };
        mailMessage.To.Add(toEmail); // E-Mail an Ihre Adresse senden
        mailMessage.ReplyToList.Add(new MailAddress(contact.Email, contact.Name)); // Damit Sie direkt antworten können

        await client.SendMailAsync(mailMessage);
    }
}