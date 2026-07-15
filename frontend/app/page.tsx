import type { Metadata } from "next";
import { fetchApi } from "@/lib/api/server";
import type { Service, Pricing, Testimonial } from "@/types";
import HeroSection from "./sections/HeroSection";
import LeistungenSection from "./sections/LeistungenSection";
import PreiseSection from "./sections/PreiseSection";
import ZusatzleistungenSection from "./sections/ZusatzleistungenSection";
import ErfolgeSection from "./sections/ErfolgeSection";
import KontaktSection from "./sections/KontaktSection";

export const metadata: Metadata = {
  title: "Power Clean Niederrhein – Professionelle Hochdruckreinigung & Winterdienst",
  description:
    "Professionelle Hochdruckreinigung und zuverlässiger Winterdienst im Niederrhein. Terrassen-, Gehweg-, Balkon- und Auffahrtreinigung in Goch, Weeze, Kevelaer und Umgebung.",
};

export default async function HomePage() {
  const [services, pricing, testimonials] = await Promise.all([
    fetchApi<Service[]>("/api/services", { tags: ["services"] }),
    fetchApi<Pricing[]>("/api/pricing", { tags: ["pricing"] }),
    fetchApi<Testimonial[]>("/api/testimonials", { tags: ["testimonials"] }),
  ]);

  const serviceList = services ?? [];
  const pricingList = pricing ?? [];
  const testimonialList = testimonials ?? [];

  return (
    <>
      <HeroSection />
      <LeistungenSection services={serviceList} />
      <PreiseSection />
      <ZusatzleistungenSection pricing={pricingList} />
      <ErfolgeSection testimonials={testimonialList} />
      <KontaktSection />
    </>
  );
}
