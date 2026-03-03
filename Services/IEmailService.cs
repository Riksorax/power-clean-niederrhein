using PowerCleanNiederrhein.Models;

namespace PowerCleanNiederrhein.Services;

public interface IEmailService
{
    Task SendEmailAsync(ContactFormModel contact);
}
