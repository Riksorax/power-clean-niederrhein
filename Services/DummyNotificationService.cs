using PowerCleanNiederrhein.Models;

namespace PowerCleanNiederrhein.Services;

public class DummyNotificationService : INotificationService
{
    public async Task<bool> SendContactFormNotification(ContactFormModel model)
    {
        // In einer echten Anwendung würden Sie hier eine E-Mail senden.
        Console.WriteLine("===== Neue Kontaktanfrage =====");
        Console.WriteLine($"Name: {model.Name}");
        Console.WriteLine($"Email: {model.Email}");
        Console.WriteLine($"Leistung: {model.Service}");
        Console.WriteLine($"Nachricht: {model.Message}");
        Console.WriteLine("===============================");

        // Simuliert eine Netzwerkverzögerung
        await Task.Delay(1000);

        // Gibt immer 'true' zurück, um einen Erfolg zu simulieren.
        return true;
    }
}