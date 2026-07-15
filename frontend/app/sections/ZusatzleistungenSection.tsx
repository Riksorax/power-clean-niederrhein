import type { Pricing } from "@/types";

interface Props {
  pricing: Pricing[];
}

export default function ZusatzleistungenSection({ pricing }: Props) {
  const half = Math.ceil(pricing.length / 2);
  const col1 = pricing.slice(0, half);
  const col2 = pricing.slice(half);

  return (
    <section id="zusatzleistungen" className="py-16 bg-beige-sand">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-center font-bold text-moss-green mb-10 text-3xl">
            Zusätzliche Leistungen
          </h2>
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {[col1, col2].map((col, colIdx) => (
                <div key={colIdx}>
                  {col.map((item, i) => (
                    <div
                      key={item.id}
                      className={`py-3 ${i < col.length - 1 ? "border-b border-gray-200" : ""}`}
                    >
                      <p className="font-semibold text-dark-gray mb-1">{item.service}</p>
                      {item.tiers.map((tier, j) => (
                        <div key={j} className="flex justify-between items-center text-sm">
                          <span className="text-light-gray">{tier.range}</span>
                          <span className="font-semibold text-moss-green whitespace-nowrap ml-4">
                            {tier.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-light-gray">
              * Alle Preise verstehen sich zzgl. MwSt. Die Pauschale gilt inkl. Anfahrt und
              Aufwand. Die genauen Kosten werden nach einer Besichtigung festgelegt.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
