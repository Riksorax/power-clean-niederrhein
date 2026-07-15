import Link from "next/link";

export default function HeroSection() {
  return (
    <header
      id="hero"
      className="relative flex items-center justify-center text-center text-off-white py-24 md:py-40"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('/images/cleanTerrasseHeader.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Strahlende Sauberkeit &amp; Freie Wege
        </h1>
        <p className="text-lg md:text-xl mb-8 mx-auto max-w-xl leading-relaxed">
          Professionelle Hochdruckreinigung und zuverlässiger Winterdienst im Niederrhein!
        </p>
        <Link
          href="#kontakt"
          className="inline-block bg-moss-green text-off-white font-semibold px-8 py-4 rounded border-2 border-beige-sand hover:bg-moss-green-dark transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          Kostenloses Angebot anfordern
        </Link>
      </div>
    </header>
  );
}
