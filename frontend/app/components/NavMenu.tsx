"use client";

import { useState } from "react";
import Link from "next/link";

export default function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 shadow-lg bg-moss-green">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="text-xl font-bold text-off-white"
            onClick={() => setOpen(false)}
          >
            Power Clean <span className="text-beige-sand">Niederrhein</span>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-6">
            <li>
              <Link href="/#leistungen" className="text-off-white hover:text-beige-sand transition-colors">
                Leistungen
              </Link>
            </li>
            <li>
              <Link href="/#preise" className="text-off-white hover:text-beige-sand transition-colors">
                Preise
              </Link>
            </li>
            <li>
              <Link href="/#erfolge" className="text-off-white hover:text-beige-sand transition-colors">
                Erfolge
              </Link>
            </li>
            <li>
              <Link
                href="/#kontakt"
                className="bg-beige-sand text-moss-green font-semibold px-4 py-2 rounded hover:bg-beige-sand-dark transition-colors"
              >
                Kontakt
              </Link>
            </li>
          </ul>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-off-white p-2"
            aria-label="Menü öffnen"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <ul className="md:hidden pb-4 flex flex-col gap-3">
            <li>
              <Link href="/#leistungen" className="block text-off-white hover:text-beige-sand transition-colors" onClick={() => setOpen(false)}>
                Leistungen
              </Link>
            </li>
            <li>
              <Link href="/#preise" className="block text-off-white hover:text-beige-sand transition-colors" onClick={() => setOpen(false)}>
                Preise
              </Link>
            </li>
            <li>
              <Link href="/#erfolge" className="block text-off-white hover:text-beige-sand transition-colors" onClick={() => setOpen(false)}>
                Erfolge
              </Link>
            </li>
            <li>
              <Link
                href="/#kontakt"
                className="inline-block bg-beige-sand text-moss-green font-semibold px-4 py-2 rounded hover:bg-beige-sand-dark transition-colors"
                onClick={() => setOpen(false)}
              >
                Kontakt
              </Link>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}
