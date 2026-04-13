# Cutover-Plan — Blazor → Next.js (ohne Downtime)

## Ausgangslage

Die aktuelle Produktion läuft als **ein einzelner Blazor Server Container** hinter Traefik.
Ziel: Ablösung durch Next.js (Frontend) + .NET API (Backend) ohne Ausfallzeit.

---

## Strategie: Parallelbetrieb mit Traefik-Routing

Blazor und Next.js laufen gleichzeitig. Traefik routet schrittweise um.
Der Wechsel ist jederzeit rückrollbar, solange Blazor noch läuft.

```
Phase A (Heute)          Phase B (Parallel)         Phase C (Cutover)
─────────────────        ──────────────────         ─────────────────
Traefik                  Traefik                    Traefik
  └── blazor (100%)        ├── blazor  (100%)         ├── frontend (100%)
                           ├── api     (intern)        └── api     (intern)
                           └── frontend (0% Traffic)
                               [nur intern testbar]
```

---

## Schritt-für-Schritt

### Phase A — Vorbereitung (kein Produktions-Eingriff)

- [ ] `backend/` Projekt anlegen und lokal testen
- [ ] `frontend/` Projekt anlegen, 1:1 Abbild der Blazor-Seite, lokal testen
- [ ] Docker Images für `api` und `frontend` bauen und in Docker Hub pushen
- [ ] Alle Umgebungsvariablen auf dem Server hinterlegen (`.env`)
- [ ] Funktionstest: `docker compose up` auf dem Server mit internen Ports (kein Traefik)

### Phase B — Parallelbetrieb (Blazor noch aktiv)

`docker-compose.yaml` erweitern — Blazor bleibt aktiv, neue Container kommen dazu:

```yaml
services:
  # Bestehend — unverändert, bleibt produktiv
  powerclean:
    image: riksorax/power-clean-niederrhein:latest
    labels:
      - "traefik.http.routers.blazor.rule=Host(`powercleanniederrhein.de`)"
      - "traefik.http.routers.blazor.priority=10"    # Niedrigere Priorität

  # Neu — noch kein öffentlicher Traffic
  frontend:
    image: riksorax/power-clean-frontend:latest
    labels:
      - "traefik.enable=false"    # Noch nicht öffentlich!

  api:
    image: riksorax/power-clean-api:latest
    labels:
      - "traefik.enable=false"    # Noch nicht öffentlich!
```

- [ ] Neue Container starten: `docker compose up -d frontend api`
- [ ] Intern testen über Server-IP oder temporäre Domain

### Phase C — Cutover (2–3 Minuten Schaltzeit)

```yaml
services:
  # Frontend übernimmt — Traefik aktivieren
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`powercleanniederrhein.de`) || Host(`www.powercleanniederrhein.de`)"
      - "traefik.http.routers.frontend.priority=20"   # Höhere Priorität als Blazor

  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`powercleanniederrhein.de`) && PathPrefix(`/api`)"
      - "traefik.http.routers.api.priority=30"        # Höchste Priorität
```

```bash
# Cutover durchführen
docker compose up -d frontend api
# Traefik übernimmt sofort — kein DNS-Wechsel, keine Downtime
```

- [ ] Seite im Browser prüfen (alle Sektionen, Kontaktformular, Mobile)
- [ ] Lighthouse SEO-Score prüfen
- [ ] Kontaktformular Testmail absenden

### Phase D — Blazor abschalten (nach 48h Beobachtung)

```bash
docker compose stop powerclean
docker compose rm powerclean
# Image optional löschen:
docker rmi riksorax/power-clean-niederrhein:latest
```

---

## Rollback

Falls nach dem Cutover Probleme auftreten:

```bash
# Frontend Priority niedriger als Blazor setzen → Blazor übernimmt sofort
# compose.yaml ändern:
#   blazor:    priority=30
#   frontend:  priority=10

docker compose up -d powerclean
# Traefik routet wieder zu Blazor — kein DNS-Wechsel
```

**Rollback-Zeitfenster:** Solange Blazor-Container noch läuft — sofort möglich.
Nach `docker compose rm powerclean` wäre ein neues Image-Pull nötig (~2 Min).

---

## Checkliste vor dem Cutover

### Technisch
- [ ] Alle Sektionen der Next.js-Seite identisch zu Blazor (visueller Vergleich)
- [ ] Kontaktformular: Testmail erhalten
- [ ] Alle Links funktionieren (/Datenschutz, /AGB, /Impressum)
- [ ] Mobile-Ansicht geprüft (iPhone + Android)
- [ ] HTTPS funktioniert (kein Mixed-Content)
- [ ] Google Analytics feuert (nach Cookie-Consent)
- [ ] Health Check API: `https://powercleanniederrhein.de/health` → 200

### SEO
- [ ] Canonical URLs korrekt gesetzt
- [ ] JSON-LD LocalBusiness Schema vorhanden
- [ ] Meta-Tags identisch (Title, Description, OG-Image)
- [ ] `robots.txt` und `sitemap.xml` erreichbar
- [ ] Google Search Console: Neue Sitemap einreichen (nach Go-Live)

### Timing
- [ ] Cutover **nicht** zu Stoßzeiten (nicht freitags, nicht morgens 9–12 Uhr)
- [ ] Backup des laufenden Blazor-Images vorhanden (`docker save`)
