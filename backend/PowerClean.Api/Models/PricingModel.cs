namespace PowerClean.Api.Models;

public record PricingTier(string Range, string Price);

public record PricingModel(
    string Id,
    string Service,
    int Sort,
    IEnumerable<PricingTier> Tiers
);
