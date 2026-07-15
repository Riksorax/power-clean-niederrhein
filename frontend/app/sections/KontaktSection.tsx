"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";

const schema = z.object({
  name: z.string().min(2, "Mindestens 2 Zeichen").max(100),
  email: z.string().email("Bitte gültige E-Mail-Adresse eingeben").max(200),
  phone: z.string().max(30).optional(),
  service: z.enum(
    [
      "Terrassenreinigung",
      "Gehwegreinigung",
      "Balkonreinigung",
      "Auffahrtreinigung",
      "Parkplatzreinigung",
      "Winterdienst",
      "Sonstiges",
    ] as const,
    { error: "Bitte eine Leistung auswählen" }
  ),
  message: z.string().min(10, "Mindestens 10 Zeichen").max(2000),
  privacyAccepted: z.literal(true, {
    error: "Bitte Datenschutzerklärung akzeptieren",
  }),
});

type FormData = z.infer<typeof schema>;

export default function KontaktSection() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setStatus("sending");
    try {
      await apiClient("/api/contact", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setStatus("success");
      reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }

  return (
    <section id="kontakt" className="py-16 bg-off-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          {/* Contact form */}
          <div className="lg:col-span-4">
            <div className="bg-white p-8 rounded-lg shadow-xl">
              <h2 className="text-2xl font-semibold text-moss-green mb-6">Schreiben Sie uns</h2>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="name" className="block text-sm text-light-gray mb-1">
                      Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      {...register("name")}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-dark-gray focus:outline-none focus:border-moss-green"
                    />
                    {errors.name && (
                      <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm text-light-gray mb-1">
                      E-Mail *
                    </label>
                    <input
                      id="email"
                      type="email"
                      {...register("email")}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-dark-gray focus:outline-none focus:border-moss-green"
                    />
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="phone" className="block text-sm text-light-gray mb-1">
                    Telefon
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-dark-gray focus:outline-none focus:border-moss-green"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="service" className="block text-sm text-light-gray mb-1">
                    Gewünschte Leistung *
                  </label>
                  <select
                    id="service"
                    {...register("service")}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-dark-gray focus:outline-none focus:border-moss-green bg-white"
                  >
                    <option value="">Bitte auswählen</option>
                    <option value="Terrassenreinigung">Terrassenreinigung</option>
                    <option value="Gehwegreinigung">Gehwegreinigung</option>
                    <option value="Balkonreinigung">Balkonreinigung</option>
                    <option value="Auffahrtreinigung">Auffahrtreinigung</option>
                    <option value="Parkplatzreinigung">Parkplatzreinigung</option>
                    <option value="Winterdienst">Winterdienst</option>
                    <option value="Sonstiges">Sonstiges / Individuelle Anfrage</option>
                  </select>
                  {errors.service && (
                    <p className="text-red-600 text-sm mt-1">{errors.service.message}</p>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="message" className="block text-sm text-light-gray mb-1">
                    Ihre Nachricht *
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    {...register("message")}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-dark-gray focus:outline-none focus:border-moss-green resize-none"
                  />
                  {errors.message && (
                    <p className="text-red-600 text-sm mt-1">{errors.message.message}</p>
                  )}
                </div>

                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("privacyAccepted")}
                      className="mt-0.5 border-moss-green accent-moss-green"
                    />
                    <span className="text-sm text-light-gray">
                      Ich habe die{" "}
                      <a href="/datenschutz" className="text-moss-green underline">
                        Datenschutzerklärung
                      </a>{" "}
                      gelesen und akzeptiere diese. *
                    </span>
                  </label>
                  {errors.privacyAccepted && (
                    <p className="text-red-600 text-sm mt-1">{errors.privacyAccepted.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full bg-moss-green text-off-white font-semibold py-3 px-6 rounded hover:bg-moss-green-dark transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {status === "sending" ? "Wird gesendet…" : "Nachricht senden"}
                </button>

                {status === "success" && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-300 text-green-800 rounded">
                    Vielen Dank für Ihre Nachricht! Wir melden uns in Kürze.
                  </div>
                )}
                {status === "error" && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded">
                    Fehler beim Senden: {errorMsg}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Contact details & service area */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-moss-green text-off-white p-6 rounded-lg shadow-xl">
              <h3 className="text-lg font-semibold text-beige-sand mb-4">Kontaktdaten</h3>
              <div className="flex items-start gap-3 mb-3">
                <svg className="w-5 h-5 text-beige-sand shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <span className="font-semibold">Adresse:</span>
                  <br />
                  Roth &amp; Speulmans Power Clean Niederrhein GbR
                  <br />
                  Thielenstr. 3
                  <br />
                  47574 Goch
                </div>
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-beige-sand shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <div className="text-sm">
                  <span className="font-semibold">E-Mail:</span>
                  <br />
                  <a href="mailto:info@powercleanniederrhein.de" className="text-beige-sand hover:underline">
                    info@powercleanniederrhein.de
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-beige-sand p-6 rounded-lg shadow-xl">
              <h3 className="text-lg font-semibold text-moss-green mb-3">Unser Servicegebiet</h3>
              <p className="text-dark-gray text-sm mb-3">
                Wir sind in der gesamten Region Niederrhein für Sie im Einsatz:
              </p>
              <ul className="space-y-2">
                {["Goch", "Weeze", "Kevelaer", "Uedem"].map((city) => (
                  <li key={city} className="flex items-center gap-2 text-dark-gray text-sm">
                    <svg className="w-4 h-4 text-moss-green shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {city}
                  </li>
                ))}
              </ul>
              <p className="text-dark-gray text-sm mt-3">Weitere Orte auf Anfrage.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
