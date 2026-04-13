# Frontend — Next.js 15 + TypeScript

## Ziel

- Öffentliche Marketing-Website mit SSR/SSG (SEO-optimiert)
- Admin-Bereich `/admin` für CMS-Verwaltung (Firebase Auth geschützt)
- Ablösung der bestehenden Blazor Server App

---

## Tech Stack

| Paket | Version | Zweck |
|-------|---------|-------|
| `next` | 15 (App Router) | Framework |
| `react` | 19 | UI |
| `typescript` | 5.x | Typsicherheit |
| `tailwindcss` | 4.x | Styling |
| `firebase` | 11.x | Auth + Firestore SDK (Client) |
| `@tanstack/react-query` | 5.x | API-Caching (Client Components) |
| `react-hook-form` + `zod` | 7.x / 3.x | Formulare + Validierung |
| `next-firebase-auth-edge` | — | Firebase Auth in Next.js Middleware |
| `sharp` | — | next/image Optimierung |

---

## Projektstruktur

```
frontend/
├── app/                              ← Next.js App Router
│   ├── layout.tsx                    ← Root Layout (Metadata, Fonts)
│   ├── page.tsx                      ← Startseite (SSG)
│   ├── datenschutz/page.tsx
│   ├── agb/page.tsx
│   ├── impressum/page.tsx
│   ├── admin/
│   │   ├── layout.tsx                ← Admin Layout (Auth-Guard)
│   │   ├── page.tsx                  ← Admin Dashboard
│   │   ├── login/page.tsx            ← Firebase Login-Seite
│   │   ├── services/page.tsx         ← Leistungen verwalten
│   │   ├── pricing/page.tsx          ← Preise verwalten
│   │   ├── testimonials/page.tsx     ← Testimonials verwalten
│   │   ├── pages/page.tsx            ← Statische Seiten (WYSIWYG)
│   │   └── contacts/page.tsx         ← Hinweis: Kontaktanfragen kommen per E-Mail (kein Admin-UI nötig)
│   └── api/
│       └── revalidate/route.ts       ← Webhook: ISR-Revalidierung bei CMS-Änderung
├── components/
│   ├── layout/
│   │   ├── NavMenu.tsx
│   │   ├── Footer.tsx
│   │   └── ScrollToTop.tsx
│   ├── sections/                     ← Alle Landing-Page-Sektionen
│   │   ├── HeroSection.tsx
│   │   ├── LeistungenSection.tsx
│   │   ├── PreiseSection.tsx
│   │   ├── ZusatzleistungenSection.tsx
│   │   ├── ErfolgeSection.tsx
│   │   └── KontaktSection.tsx
│   ├── admin/                        ← Admin UI Komponenten
│   │   ├── AdminSidebar.tsx
│   │   ├── ServiceForm.tsx
│   │   ├── PricingForm.tsx
│   │   ├── ImageUpload.tsx           ← Firebase Storage Upload
│   │   └── ImageUpload.tsx           ← Firebase Storage Upload
│   └── ui/
│       ├── ServiceCard.tsx
│       ├── PricingCard.tsx
│       ├── TestimonialCard.tsx
│       └── LoadingSkeleton.tsx
├── lib/
│   ├── firebase/
│   │   ├── client.ts                 ← Firebase Client SDK (Auth, Firestore, Storage)
│   │   └── admin.ts                  ← Firebase Admin SDK (Server-seitig)
│   ├── api/
│   │   ├── client.ts                 ← Fetch-Wrapper zum .NET API
│   │   ├── services.ts
│   │   ├── pricing.ts
│   │   ├── testimonials.ts
│   │   └── contact.ts
│   └── hooks/
│       ├── useAuth.ts                ← Firebase Auth Hook
│       └── useServices.ts
├── middleware.ts                     ← Firebase Auth Route Protection
├── types/
│   ├── service.ts
│   ├── pricing.ts
│   ├── testimonial.ts
│   ├── contact.ts
│   └── firebase.ts
├── public/
│   ├── images/                       ← Statische WebP-Assets (Migration)
│   ├── fonts/
│   ├── robots.txt
│   └── sitemap.xml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local.example
└── Dockerfile
```

---

## Rendering-Strategie

| Seite | Strategie | Begründung |
|-------|-----------|------------|
| `/` (Startseite) | ISR (60 Min) | SEO-kritisch, Inhalte ändern sich selten |
| `/datenschutz` | SSG (static) | Ändert sich kaum |
| `/agb` | SSG (static) | Ändert sich kaum |
| `/impressum` | SSG (static) | Ändert sich kaum |
| `/admin/*` | CSR (dynamic) | Auth-geschützt, kein SEO nötig |

```typescript
// app/page.tsx — ISR (Incremental Static Regeneration)
export const revalidate = 3600; // Alle 60 Minuten neu generieren

export default async function HomePage() {
  // Server Component: direkt vom .NET API fetchen (kein Client-JS)
  const [services, pricing, testimonials] = await Promise.all([
    fetch(`${process.env.API_URL}/api/services`, { next: { revalidate: 3600 } }),
    fetch(`${process.env.API_URL}/api/pricing`,  { next: { revalidate: 3600 } }),
    fetch(`${process.env.API_URL}/api/testimonials`, { next: { revalidate: 3600 } }),
  ]).then(rs => Promise.all(rs.map(r => r.json())));

  return (
    <main>
      <HeroSection />
      <LeistungenSection services={services} />
      <PreiseSection pricing={pricing} />
      <ErfolgeSection testimonials={testimonials} />
      <KontaktSection />
    </main>
  );
}
```

---

## Firebase Auth Integration

### Client SDK Setup

```typescript
// lib/firebase/client.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
```

### Middleware (Route Protection)

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from 'next-firebase-auth-edge';

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    loginPath:   '/admin/login',
    logoutPath:  '/admin/logout',
    apiKey:      process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName:  'AuthToken',
    cookieSecret: process.env.COOKIE_SECRET!,
    cookieSerializeOptions: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 Tage
    },
    serviceAccount: {
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!,
    },
  });
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

### Login-Seite

```typescript
// app/admin/login/page.tsx
'use client';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function LoginPage() {
  const handleLogin = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    // Token als HttpOnly-Cookie setzen (via next-firebase-auth-edge)
    await fetch('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    window.location.href = '/admin';
  };
  // ...
}
```

---

## Error Handling

### Error Boundary (API-Ausfall)

Next.js App Router nutzt `error.tsx` Dateien als Error Boundaries:

```typescript
// app/error.tsx — globaler Fallback wenn API nicht erreichbar
'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="text-center py-20">
      <h2>Seite konnte nicht vollständig geladen werden.</h2>
      <p>Bitte versuche es erneut oder kontaktiere uns direkt.</p>
      <a href="mailto:info@powercleanniederrhein.de">
        info@powercleanniederrhein.de
      </a>
      <button onClick={reset}>Erneut versuchen</button>
    </div>
  );
}
```

```typescript
// app/not-found.tsx — 404 Seite
export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h2>Seite nicht gefunden</h2>
      <a href="/">Zurück zur Startseite</a>
    </div>
  );
}
```

Wenn die `.NET API` beim SSR-Rendern nicht erreichbar ist, zeigt Next.js
den `error.tsx` Fallback — die Seite bleibt nutzbar mit Kontaktmöglichkeit.

---

## ISR Revalidierung bei CMS-Änderung

Wenn im Directus CMS etwas geändert wird, soll die Next.js-Seite automatisch neu gebaut werden:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Startseite neu generieren
  revalidatePath('/');
  return Response.json({ revalidated: true });
}
```

Directus Flow (Webhook) ruft diesen Endpunkt auf, sobald ein Inhalt veröffentlicht wird.

---

## SEO (Metadata API)

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://powercleanniederrhein.de'),
  title: {
    default: 'Power Clean Niederrhein – Professionelle Reinigung',
    template: '%s | Power Clean Niederrhein',
  },
  description: 'Terrassenreinigung, Gehwegreinigung, Winterdienst im Niederrhein.',
  openGraph: {
    images: ['/images/cleanTerrasseHeader.webp'],
    locale: 'de_DE',
    type: 'website',
  },
  alternates: {
    canonical: 'https://powercleanniederrhein.de',
  },
};
```

```typescript
// JSON-LD Structured Data
export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Power Clean Niederrhein',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Thielenstr. 3',
      addressLocality: 'Goch',
      postalCode: '47574',
      addressCountry: 'DE',
    },
    email: 'info@powercleanniederrhein.de',
  };
  return (
    <html lang="de">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Umgebungsvariablen

```bash
# frontend/.env.local.example

# .NET API URL (intern in Docker: http://api:8080)
API_URL=http://api:8080
NEXT_PUBLIC_API_URL=https://powercleanniederrhein.de

# Firebase (öffentlich — nur Client-Konfiguration)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (geheim — nur serverseitig!)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=       # "-----BEGIN PRIVATE KEY-----\n..."

# Next.js
COOKIE_SECRET=ZufälligerStringMin32Zeichen
REVALIDATE_SECRET=ZufälligerString
```

> **Achtung:** `NEXT_PUBLIC_*` Variablen sind im Browser-Bundle sichtbar.
> Alle anderen (besonders `FIREBASE_PRIVATE_KEY`) niemals mit `NEXT_PUBLIC_` prefixen!

---

## Dockerfile (Next.js Standalone)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Nicht als root laufen
RUN addgroup --system nodejs && adduser --system nextjs --ingroup nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

```typescript
// next.config.ts
export default {
  output: 'standalone',    // Minimales Docker-Image
  images: {
    remotePatterns: [
      { hostname: 'firebasestorage.googleapis.com' },   // Firebase Storage Bilder
    ],
  },
};
```

---

## Migration von Blazor

| Blazor-Datei | Next.js-Pendant |
|-------------|-----------------|
| `HeroSection.razor` | `components/sections/HeroSection.tsx` |
| `LeistungenSection.razor` | `components/sections/LeistungenSection.tsx` |
| `PreiseSection.razor` | `components/sections/PreiseSection.tsx` |
| `ZusatzleistungenSection.razor` | `components/sections/ZusatzleistungenSection.tsx` |
| `ErfolgeSection.razor` | `components/sections/ErfolgeSection.tsx` |
| `KontaktSection.razor` | `components/sections/KontaktSection.tsx` |
| `NavMenu.razor` | `components/layout/NavMenu.tsx` |
| `Footer.razor` | `components/layout/Footer.tsx` |
| `App.razor` (Meta-Tags) | `app/layout.tsx` (Next.js Metadata API) |
| `Datenschutz.razor` | `app/datenschutz/page.tsx` |
| `AGB.razor` | `app/agb/page.tsx` |
| `Impressum.razor` | `app/impressum/page.tsx` |
| `app.css` | `app/globals.css` + Tailwind |
| `wwwroot/images/` | `public/images/` |
