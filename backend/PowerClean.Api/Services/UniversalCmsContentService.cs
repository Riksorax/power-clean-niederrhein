using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using PowerClean.Api.Models;
using PowerClean.Api.Options;

namespace PowerClean.Api.Services;

/// <summary>
/// Liest Inhalte über die Delivery-API des selbstgehosteten "universal-cms"
/// (https://cms.webappniederrhein.de/delivery/{projectSlug}/{collectionSlug}).
/// Erwartete Collections/Felder im CMS für dieses Projekt:
///   leistungen:    title, description, imageUrl (Media), altText, sort (Number)
///   erfolge:       title, text, imageUrl (Media), altText, sort (Number)
///   preise:        service, sort (Number), tiers (Json: [{ "range": "...", "price": "..." }])
/// </summary>
public class UniversalCmsContentService(HttpClient http, IOptions<UniversalCmsOptions> options) : IContentService
{
    // AllowReadingFromString: verzeiht, wenn ein Number-Feld im CMS versehentlich als Text-Feld
    // angelegt wurde (Wert kommt dann als JSON-String "1" statt Zahl 1) - kein Redaktionsstopp nötig.
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };
    private readonly UniversalCmsOptions _options = options.Value;

    private record DeliveryEntry<T>(string Id, [property: JsonPropertyName("data")] T Data);
    private record DeliveryResponse<T>(List<DeliveryEntry<T>> Items);

    private record ServiceFields(string Title, string Description, string ImageUrl, string AltText, int Sort);
    private record TestimonialFields(string Title, string Text, string ImageUrl, string AltText, int Sort);
    private record PricingFields(string Service, int Sort, List<PricingTier> Tiers);

    private async Task<List<DeliveryEntry<T>>> FetchAsync<T>(string collectionSlug)
    {
        var url = $"/delivery/{_options.ProjectSlug}/{collectionSlug}?sort=sort&limit=200";
        var response = await http.GetAsync(url);
        if (!response.IsSuccessStatusCode) return [];

        var body = await response.Content.ReadFromJsonAsync<DeliveryResponse<T>>(JsonOpts);
        return body?.Items ?? [];
    }

    public async Task<IEnumerable<ServiceModel>> GetServicesAsync()
    {
        var entries = await FetchAsync<ServiceFields>("leistungen");
        return entries.Select(e => new ServiceModel(e.Id, e.Data.Title, e.Data.Description, e.Data.ImageUrl, e.Data.AltText, e.Data.Sort));
    }

    public async Task<IEnumerable<PricingModel>> GetPricingAsync()
    {
        var entries = await FetchAsync<PricingFields>("preise");
        return entries.Select(e => new PricingModel(e.Id, e.Data.Service, e.Data.Sort, e.Data.Tiers));
    }

    public async Task<IEnumerable<TestimonialModel>> GetTestimonialsAsync()
    {
        var entries = await FetchAsync<TestimonialFields>("erfolge");
        return entries.Select(e => new TestimonialModel(e.Id, e.Data.Title, e.Data.Text, e.Data.ImageUrl, e.Data.AltText, e.Data.Sort));
    }
}
