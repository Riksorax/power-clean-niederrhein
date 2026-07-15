using System.Text.Json;
using PowerClean.Api.Models;

namespace PowerClean.Api.Services;

public class JsonContentService(IWebHostEnvironment env) : IContentService
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private async Task<IEnumerable<T>> ReadAsync<T>(string fileName)
    {
        var path = Path.Combine(env.ContentRootPath, "data", fileName);
        await using var stream = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<IEnumerable<T>>(stream, JsonOpts) ?? [];
    }

    public Task<IEnumerable<ServiceModel>>     GetServicesAsync()     => ReadAsync<ServiceModel>("services.json");
    public Task<IEnumerable<PricingModel>>     GetPricingAsync()      => ReadAsync<PricingModel>("pricing.json");
    public Task<IEnumerable<TestimonialModel>> GetTestimonialsAsync() => ReadAsync<TestimonialModel>("testimonials.json");
}
