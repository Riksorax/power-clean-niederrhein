import Image from "next/image";
import { notFound } from "next/navigation";

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

interface PreviewEntry {
  id: string;
  status: "draft" | "published";
  data: Record<string, unknown>;
}

async function fetchPreview(token: string): Promise<PreviewEntry | null> {
  try {
    const res = await fetch(`${API_URL}/api/preview/${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PreviewEntry;
  } catch {
    return null;
  }
}

// Zeigt einen einzelnen Eintrag unabhängig von seiner Collection generisch an — Redakteure
// sollen hier sehen, wie ein noch unveröffentlichter Entwurf inhaltlich aussieht, nicht die
// exakte Optik der Live-Seite (die hängt vom jeweiligen Abschnitt/Layout ab).
export default async function PreviewPage({
  searchParams,
}: {
  params: Promise<{ collectionSlug: string; entryId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();

  const entry = await fetchPreview(token);
  if (!entry) notFound();

  const imageValue = Object.entries(entry.data).find(([key]) => /image|bild/i.test(key))?.[1];
  const imageUrl = typeof imageValue === "string" ? imageValue : null;

  return (
    <main className="min-h-screen bg-beige-sand py-16">
      <div className="container mx-auto max-w-2xl px-4">
        <p className="mb-4 inline-block rounded bg-moss-green px-3 py-1 text-sm font-semibold text-off-white">
          Vorschau — {entry.status === "published" ? "veröffentlicht" : "Entwurf"}
        </p>
        <div className="overflow-hidden rounded-lg bg-off-white shadow-md">
          {imageUrl && (
            <div className="relative h-64 w-full">
              <Image src={imageUrl} alt="" fill className="object-cover" />
            </div>
          )}
          <div className="space-y-3 p-6">
            {Object.entries(entry.data)
              .filter(([key, value]) => value !== imageUrl && typeof value !== "object")
              .map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-dark-gray/60">{key}</p>
                  <p className="text-dark-gray">{String(value)}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
