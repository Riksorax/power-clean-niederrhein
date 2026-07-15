namespace PowerClean.Api.Models;

public record ServiceModel(
    string Id,
    string Title,
    string Description,
    string ImageUrl,
    string AltText,
    int Sort
);
