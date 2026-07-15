using PowerClean.Api.Models;

namespace PowerClean.Api.Services;

public interface IContentService
{
    Task<IEnumerable<ServiceModel>> GetServicesAsync();
    Task<IEnumerable<PricingModel>> GetPricingAsync();
    Task<IEnumerable<TestimonialModel>> GetTestimonialsAsync();
}
