using PowerClean.Api.Models;

namespace PowerClean.Api.Services;

public interface IEmailService
{
    Task SendEmailAsync(ContactFormModel contact);
}
