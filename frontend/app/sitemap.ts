import type { MetadataRoute } from "next";

const BASE_URL = "https://powercleanniederrhein.de";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, priority: 1.0, changeFrequency: "monthly" },
    { url: `${BASE_URL}/impressum`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${BASE_URL}/datenschutz`, priority: 0.3, changeFrequency: "yearly" },
    { url: `${BASE_URL}/agb`, priority: 0.3, changeFrequency: "yearly" },
  ];
}
