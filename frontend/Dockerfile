FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# NEXT_PUBLIC_API_URL landet fest im Client-Bundle - muss beim Build die echte Produktions-URL
# sein. API_URL ist server-only (lib/api/server.ts) und wird zur Laufzeit aus der echten
# Container-Umgebung gelesen; der Build-Zeit-Wert dient nur dazu, dass next build beim
# Vorrendern der Startseite eine gültige (wenn auch unerreichbare) URL zum Fetchen hat.
ARG NEXT_PUBLIC_API_URL
ARG API_URL=http://api:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_URL=$API_URL

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
