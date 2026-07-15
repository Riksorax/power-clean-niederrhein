import Image from "next/image";
import type { Service } from "@/types";

interface Props {
  services: Service[];
}

export default function LeistungenSection({ services }: Props) {
  return (
    <section id="leistungen" className="py-16 bg-beige-sand">
      <div className="container mx-auto px-4">
        <h2 className="text-center font-bold text-moss-green mb-12 text-4xl">
          Unsere Kernleistungen
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-off-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative w-full h-48">
                <Image
                  src={service.imageUrl}
                  alt={service.altText}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-moss-green mb-3">
                  {service.title}
                </h3>
                <p className="text-dark-gray">{service.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
