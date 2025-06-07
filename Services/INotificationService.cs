using PowerCleanNiederrhein.Models;

namespace PowerCleanNiederrhein.Services;

public interface INotificationService
{
    Task<bool> SendContactFormNotification(ContactFormModel model);
}