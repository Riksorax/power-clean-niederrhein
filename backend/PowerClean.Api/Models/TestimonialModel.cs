namespace PowerClean.Api.Models;

public record TestimonialModel(
    string Id,
    string Title,
    string Text,
    string ImageUrl,
    string AltText,
    int Sort
);
