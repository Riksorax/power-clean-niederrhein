namespace PowerClean.Api.Options;

public class UniversalCmsOptions
{
    public const string Section = "UniversalCms";

    public string? BaseUrl { get; set; }
    public string? ApiKey { get; set; }
    public string? ProjectSlug { get; set; }
}
