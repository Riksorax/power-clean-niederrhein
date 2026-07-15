import Image from "next/image";
import type { Testimonial } from "@/types";

interface Props {
  testimonials: Testimonial[];
}

export default function ErfolgeSection({ testimonials }: Props) {
  return (
    <section id="erfolge" className="py-16 bg-off-white">
      <div className="container mx-auto px-4">
        <h2 className="text-center font-bold text-moss-green mb-12 text-4xl">
          Unsere Erfolge sprechen für sich
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative w-full h-48">
                <Image
                  src={t.imageUrl}
                  alt={t.altText}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  loading="lazy"
                />
              </div>
              <div className="p-5 bg-beige-sand">
                <h3 className="text-lg font-semibold text-moss-green mb-2">{t.title}</h3>
                <p className="text-dark-gray text-sm">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
