# Frontend — Next.js 16 + TypeScript

## Status

| Phase | Inhalt | Status |
|-------|--------|--------|
| **2** | Next.js Frontend (Ablösung Blazor, SSR/SSG) | ✅ **Implementiert** |
| **3** | universal-cms-Integration (Content, Live-Vorschau) | ✅ **Implementiert** — Collections/Einträge im CMS-Admin folgen |
| **4** | ISR-Revalidierung per CMS-Webhook | ⏳ Geplant |

---

## Ziel

- Öffentliche Marketing-Website mit SSR/ISR (SEO-optimiert)
- Admin-Bereich `/admin` für CMS-Verwaltung (Firebase Auth geschützt) — Phase 3
- Ablösung der bestehenden Blazor Server App

---

## Tech Stack

| Paket | Version | Zweck |
|-------|---------|-------|
| `next` | **16.2.3** (App Router) | Framework |
| `react` | **19.2.4** | UI |
| `typescript` | 5.x | Typsicherheit |
| `tailwindcss` | **4.x** (kein `tailwind.config.ts` nötig) | Styling |
| `firebase` | **12.x** | Auth + Storage SDK (Client) |
| `@tanstack/react-query` | 5.x | API-Caching (Client Components) |
| `react-hook-form` | 7.x | Formular-State |
| `@hookform/resolvers` | 5.x | Zod-Integration für react-hook-form |
| `zod` | **4.x** | Schema-Validierung |
| `next-firebase-auth-edge` | 1.x | Firebase Auth in Next.js Middleware |

---

## Projektstruktur (aktueller Stand)

```
frontend/
├── app/                              ← Next.js App Router
│   ├── layout.tsx                    ← Root Layout (lang="de", NavMenu + Footer)
│   ├── page.tsx                      ← Startseite (ISR, 10 Min)
│   ├── globals.css                   ← Inter Font, Tailwind v4 @theme, Brand-Farben
│   ├── datenschutz/page.tsx          ← Statische Seite (noindex)
│   ├── agb/page.tsx                  ← Statische Seite (noindex)
│   ├── impressum/page.tsx            ← Statische Seite (noindex)
│   ├── components/
│   │   ├── NavMenu.tsx               ← Client Component (Hamburger-Toggle)
│   │   └── Footer.tsx                ← Server Component
│   ├── sections/                     ← Alle Landing-Page-Sektionen
│   │   ├── HeroSection.tsx           ← Server Component
│   │   ├── LeistungenSection.tsx     ← Server Component (props: Service[])
│   │   ├── PreiseSection.tsx         ← Server Component (statisch)
│   │   ├── ZusatzleistungenSection.tsx ← Server Component (props: Pricing[])
│   │   ├── ErfolgeSection.tsx        ← Server Component (props: Testimonial[])
│   │   └── KontaktSection.tsx        ← Client Component (react-hook-form + zod)
│   ├── admin/                        ← [Phase 3] Firebase Auth geschützt
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── login/page.tsx
│   └── api/
│       └── revalidate/route.ts       ← ISR-Webhook (revalidateTag, REVALIDATE_SECRET)
├── lib/
│   ├── firebase/
│   │   └── client.ts                 ← Firebase Client SDK (Auth + Storage)
│   └── api/
│       ├── client.ts                 ← Fetch-Wrapper (NEXT_PUBLIC_API_URL, für Client Components)
│       └── server.ts                 ← Fetch-Wrapper (API_URL, ISR-Tags, für Server Components)
├── types/
│   └── index.ts                      ← Service, Pricing, Testimonial, ContactFormData
├── middleware.ts                     ← [Phase 3] Firebase Auth Route Protection
├── public/
│   ├── images/                       ← WebP-Assets (aus wwwroot/images/ migriert)
│   └── fonts/                        ← Inter WOFF2-Dateien (aus wwwroot/fonts/ migriert)
├── next.config.ts
├── tsconfig.json
├── .env.local.example
└── Dockerfile
```

---

## Rendering-Strategie

| Seite | Strategie | Revalidierung |
|-------|-----------|---------------|
| `/` (Startseite) | ISR | 10 Min (`revalidateTag`) |
| `/datenschutz` | SSG (static) | — |
| `/agb` | SSG (static) | — |
| `/impressum` | SSG (static) | — |
| `/admin/*` | CSR / dynamic | — (Phase 3) |

### Datenfluss Startseite

```typescript
// app/page.tsx — Server Component, ISR
export default async function HomePage() {
  const [services, pricing, testimonials] = await Promise.all([
    fetchApi<Service[]>("/api/services", { tags: ["services"] }),
    fetchApi<Pricing[]>("/api/pricing",  { tags: ["pricing"] }),
    fetchApi<Testimonial[]>("/api/testimonials", { tags: ["testimonials"] }),
  ]);
  // Graceful fallback wenn API beim Build nicht erreichbar:
  const serviceList = services ?? [];
  // ...
}
```

### Server-seitiger Fetch-Wrapper

```typescript
// lib/api/server.ts — nur in Server Components / Route Handlers verwenden
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchApi<T>(
  path: string,
  options?: { revalidate?: number; tags?: string[] }
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: {
        revalidate: options?.revalidate ?? 600,
        tags: options?.tags,
      },
    });
    if (!res.ok) { console.error(`API ${res.status}: ${path}`); return null; }
    return res.json();
  } catch (err) {
    console.error(`fetchApi failed for ${path}:`, err);
    return null;
  }
}
```

---

## ISR Revalidierung bei CMS-Änderung

```typescript
// app/revalidate/route.ts
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tag } = await request.json().catch(() => ({}));

  if (!tag || tag === "all") {
    revalidateTag("services", "max");   // Next.js 16: 2. Argument nötig!
    revalidateTag("pricing",  "max");
    revalidateTag("testimonials", "max");
  } else {
    revalidateTag(tag, "max");
  }
  return NextResponse.json({ revalidated: true, tag });
}
```

> **Hinweis Next.js 16:** `revalidateTag(tag)` ist deprecated.
> Zweites Argument `"max"` (stale-while-revalidate Semantik) ist Pflicht.

Ein Webhook im universal-cms-Projekt (Event `entry.published`) soll künftig diesen Endpunkt aufrufen:
```
POST /revalidate
Header: x-revalidate-secret: <REVALIDATE_SECRET>
Body:   { "tag": "services" }   // oder "all" für alles
```

---

## Kontaktformular (Client Component)

```typescript
// app/sections/KontaktSection.tsx — 'use client'
// Zod v4 Syntax (geändert gegenüber v3):
const schema = z.object({
  service: z.enum(["Terrassenreinigung", ...] as const, {
    error: "Bitte auswählen"     // v4: 'error' statt 'errorMap'
  }),
  privacyAccepted: z.literal(true, {
    error: "Datenschutz akzeptieren"
  }),
  // ...
});
```

POST geht an `.NET API /api/contact` — kein Firestore, nur E-Mail (SMTP).

---

## Brand-Farben (Tailwind v4 `@theme`)

```css
/* app/globals.css */
@theme inline {
  --font-sans: 'Inter', sans-serif;
  --color-moss-green:       #556b2f;
  --color-moss-green-dark:  #455725;
  --color-beige-sand:       #f5e6ca;
  --color-beige-sand-dark:  #e0d5b9;
  --color-off-white:        #faf9f6;
  --color-dark-gray:        #333333;
  --color-light-gray:       #666666;
}
```

Verwendung: `bg-moss-green`, `text-beige-sand`, `border-off-white`, etc.

In Tailwind v4 ist **kein** `tailwind.config.ts` mehr nötig.

---

## Firebase Auth Integration (Phase 3)

### Client SDK — aktueller Stand

```typescript
// lib/firebase/client.ts (implementiert)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const storage = getStorage(app);
// getFirestore() wird erst in Phase 3 hinzugefügt, wenn Admin-UI benötigt
```

### Middleware (Phase 3 — noch nicht implementiert)

```typescript
// middleware.ts — ausstehend
import { authMiddleware } from 'next-firebase-auth-edge';

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    loginPath:    '/admin/login',
    logoutPath:   '/admin/logout',
    apiKey:       process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName:   'AuthToken',
    cookieSecret: process.env.COOKIE_SECRET!,
    cookieSerializeOptions: {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
    },
    serviceAccount: {
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!,
    },
  });
}
export const config = { matcher: ['/admin/:path*'] };
```

---

## SEO (Metadata API)

```typescript
// app/layout.tsx — implementiert
export const metadata: Metadata = {
  metadataBase: new URL('https://powercleanniederrhein.de'),
  title: 'Power Clean Niederrhein – Professionelle Hochdruckreinigung & Winterdienst',
  description: '...',
};
```

JSON-LD Structured Data für LocalBusiness ist noch nicht implementiert — empfohlen für Phase 2 Abschluss.

---

## Umgebungsvariablen

```bash
# frontend/.env.local.example

# .NET API
API_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase (öffentlich — aus Firebase Console: Projekteinstellungen > Deine Apps)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (geheim — niemals mit NEXT_PUBLIC_ prefixen!)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=     # "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Next.js
COOKIE_SECRET=            # min. 32 Zeichen: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
REVALIDATE_SECRET=        # beliebig zufällig: gleicher Befehl
```

> **Achtung:** `NEXT_PUBLIC_*` sind im Browser-Bundle sichtbar.
> `FIREBASE_PRIVATE_KEY`, `COOKIE_SECRET`, `REVALIDATE_SECRET` niemals mit `NEXT_PUBLIC_` prefixen!

---

## Dockerfile (Next.js Standalone)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system nodejs && adduser --system nextjs --ingroup nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Migration von Blazor — Mapping

| Blazor-Datei | Next.js-Pendant | Status |
|-------------|-----------------|--------|
| `HeroSection.razor` | `app/sections/HeroSection.tsx` | ✅ |
| `LeistungenSection.razor` | `app/sections/LeistungenSection.tsx` | ✅ |
| `PreiseSection.razor` | `app/sections/PreiseSection.tsx` | ✅ |
| `ZusatzleistungenSection.razor` | `app/sections/ZusatzleistungenSection.tsx` | ✅ |
| `ErfolgeSection.razor` | `app/sections/ErfolgeSection.tsx` | ✅ |
| `KontaktSection.razor` | `app/sections/KontaktSection.tsx` | ✅ |
| `NavMenu.razor` | `app/components/NavMenu.tsx` | ✅ |
| `Footer.razor` | `app/components/Footer.tsx` | ✅ |
| `App.razor` (Meta-Tags) | `app/layout.tsx` | ✅ |
| `Datenschutz.razor` | `app/datenschutz/page.tsx` | ✅ |
| `AGB.razor` | `app/agb/page.tsx` | ✅ |
| `Impressum.razor` | `app/impressum/page.tsx` | ✅ |
| `app.css` | `app/globals.css` + Tailwind v4 | ✅ |
| `wwwroot/images/` | `public/images/` | ✅ |
| `wwwroot/fonts/` | `public/fonts/` | ✅ |
| `ScrollToTop.razor` | Nicht nötig (Next.js scrollt nativ) | ✅ |
| `AdminEndpoints` | `app/admin/` | ⏳ Phase 3 |
| `middleware.ts` | Route Protection | ⏳ Phase 3 |
