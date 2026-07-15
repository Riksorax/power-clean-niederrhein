import Link from "next/link";

export default function PreiseSection() {
  return (
    <section id="preise" className="py-16 bg-off-white">
      <div className="container mx-auto px-4">
        <h2 className="text-center font-bold text-moss-green mb-4 text-4xl">
          Faire Preise – Klare Leistung
        </h2>
        <p className="text-center text-dark-gray mb-12 mx-auto max-w-2xl">
          Unsere Preisgestaltung ist transparent und fair. Die folgenden Pakete dienen als erste
          Orientierung. Für ein genaues Angebot, das auf Ihre spezifischen Bedürfnisse zugeschnitten
          ist, kontaktieren Sie uns bitte.
        </p>

        <div className="flex justify-center">
          <div className="w-full max-w-sm bg-white rounded-lg shadow-lg border-2 border-beige-sand text-center">
            <div className="p-8">
              <h3 className="text-xl font-semibold text-moss-green mb-3">
                Individuelles Projekt
              </h3>
              <p className="text-5xl font-bold text-moss-green mb-3">Individuell</p>
              <p className="text-dark-gray mb-6">
                Für Projekte jeder Größenordnung und Ihre ganz individuellen Anforderungen.
              </p>
              <ul className="text-left mb-6 space-y-2">
                {[
                  "Komplette Außenreinigung / Winterdienst nach Maß",
                  "Optionale Zusatzleistungen",
                  "Persönliche Beratung & Planung",
                  "Flexible Terminfindung",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-dark-gray">
                    <span className="text-moss-green font-bold shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="#kontakt"
                className="block bg-moss-green text-off-white font-semibold px-6 py-3 rounded hover:bg-moss-green-dark transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                Angebot einholen
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center mt-10 text-dark-gray">
          Alle Preise sind Richtwerte und können je nach Verschmutzungsgrad und Aufwand variieren.
          Kontaktieren Sie uns für ein individuelles Angebot!
        </p>
      </div>
    </section>
  );
}
