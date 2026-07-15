import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-10 text-center bg-moss-green text-beige-sand">
      <div className="container mx-auto px-4">
        <p className="mb-2">
          &copy; {year} Power Clean Niederrhein. Alle Rechte vorbehalten.
        </p>
        <p className="mb-4">
          <Link href="/impressum" className="text-off-white hover:text-beige-sand hover:underline transition-colors">
            Impressum
          </Link>
          {" | "}
          <Link href="/datenschutz" className="text-off-white hover:text-beige-sand hover:underline transition-colors">
            Datenschutz
          </Link>
          {" | "}
          <Link href="/agb" className="text-off-white hover:text-beige-sand hover:underline transition-colors">
            AGB
          </Link>
        </p>

        <div className="flex justify-center gap-4 mb-4">
          {/* Instagram */}
          <a
            href="https://www.instagram.com/power_clean_niederrhein"
            aria-label="Instagram Profil von Power Clean Niederrhein"
            target="_blank"
            rel="noopener noreferrer"
            className="text-beige-sand hover:text-off-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4c2.21 0 4 1.791 4 4s-1.79 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
          {/* TikTok */}
          <a
            href="https://www.tiktok.com/@powercleanniederrhein"
            aria-label="TikTok Profil von Power Clean Niederrhein"
            target="_blank"
            rel="noopener noreferrer"
            className="text-beige-sand hover:text-off-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z" />
            </svg>
          </a>
        </div>

        <p className="text-sm">
          Powered by{" "}
          <a
            href="https://webappniederrhein.de/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-off-white hover:underline"
          >
            Web &amp; App Entwicklung am Niederrhein
          </a>
        </p>
      </div>
    </footer>
  );
}
