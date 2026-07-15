# Geplante Rechtstexte-Aktualisierungen

Alle Änderungen an `Datenschutz.razor` und `AGB.razor` erfolgen **erst beim Go-Live**
des neuen Stacks (nach Phase 3). Vorher bleibt der Ist-Stand unverändert.

---

## AGB — keine Änderung nötig

Die AGB regeln den Reinigungsvertrag, nicht die Technik. §9 verweist nur
auf die Datenschutzerklärung — das bleibt korrekt.

---

## Datenschutzerklärung — geplante Änderungen

### Wann: vor Go-Live Phase 3 (Firebase Storage live)

### Was sich ändert und warum

Statt einer eigenen Firebase-Instanz nutzt das Projekt jetzt das externe, self-hostete
**universal-cms** (`cms.webappniederrhein.de`) — Bilder werden von dessen Media-Endpunkt
ausgeliefert (`https://cms.webappniederrhein.de/media/...`), der intern von Firebase Storage
(Google Cloud) gestützt wird.

| Dienst | Besucher-Kontakt? | Datenschutz-Eintrag nötig? |
|--------|-------------------|--------------------------|
| universal-cms — Admin-Login | Nein (nur interner Redakteurs-Zugang, fremdes Projekt des Betreibers) | Nein |
| universal-cms — Bildauslieferung (`cms.webappniederrhein.de/media/...`) | **Ja** (Browser lädt Bilder von dieser Domain, dahinter Firebase Storage/Google) | **Ja** |
| .NET API | Ja (bereits als Hoster / Backend abgedeckt) | Kein neuer Abschnitt |

**⚠️ Rechtlich zu prüfen (kein Ersatz für anwaltliche Beratung):** Der folgende Textentwurf muss
noch angepasst werden — Domain und Formulierung (`cms.webappniederrhein.de` statt einer eigenen
`firebasestorage.googleapis.com`-URL) sowie der Umstand, dass es sich um eine vom Betreiber
selbst gehostete, aber technisch fremde/geteilte Instanz handelt.

### Einzige notwendige Ergänzung: Abschnitt „Bildauslieferung über universal-cms"

Neuer Abschnitt nach dem aktuellen Abschnitt 9 (Google Analytics) einfügen.
Bisheriger Abschnitt 10 (Streitschlichtung) wird zu Abschnitt 11.

```
Abschnitt 10 — Bildauslieferung über universal-cms

Auf dieser Website werden Bilder über cms.webappniederrhein.de eingebunden,
ein selbstgehostetes Content-Management-System des Betreibers, das intern
Firebase Storage nutzt (ein Dienst der Google Ireland Limited, Gordon House,
Barrow Street, Dublin 4, Irland). Wenn Sie eine Seite mit solchen Bildern
aufrufen, stellt Ihr Browser eine direkte Verbindung zu diesem Server her.
Dabei wird unter anderem Ihre IP-Adresse übermittelt.

Zweck: Bereitstellung und schnelle Auslieferung von Bild-Dateien
(Fotos unserer Leistungen und Referenzprojekte).

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
an der optimalen Darstellung unserer Website).

Speicherort: Das zugrundeliegende Firebase-Projekt ist in der Region
europe-west3 (Frankfurt, Deutschland) gehostet. Die Daten verbleiben
innerhalb der EU.

Auftragsverarbeitung: Mit Google Ireland Limited besteht ein Vertrag
zur Auftragsverarbeitung gemäß Art. 28 DSGVO
(Google Cloud Data Processing Amendment).

Weitere Informationen: https://policies.google.com/privacy
```

### Was NICHT erwähnt werden muss

- **universal-cms Admin-Login** — nur für interne Redakteure (1–2 Personen),
  kein Website-Besucher interagiert damit. Kein Eintrag nötig.
- **Kontaktformular** — bleibt unverändert (SMTP-E-Mail).
  Bestehender Abschnitt „Kontaktformular" bleibt korrekt.

---

## Cookie Banner (CCM19) — Überprüfung & Anpassung

### Wann: vor Go-Live Phase 3 (Firebase Storage live)

Der bestehende CCM19-Banner muss geprüft und ggf. neu konfiguriert werden,
da mit Firebase Storage ein neuer Drittanbieter hinzukommt, dessen Verbindung
beim Seitenaufruf **ohne aktive Nutzerinteraktion** entsteht (kein Cookie nötig,
aber IP-Übermittlung an Google).

### Was zu prüfen ist

| Punkt | Aktion |
|-------|--------|
| Firebase Storage als Dienst in CCM19 eintragen | Neuen Dienst anlegen: „Firebase Storage / Google Cloud" |
| Kategorie festlegen | „Technisch notwendig" — Bilder sind für die Darstellung der Seite erforderlich (kein Consent nötig) |
| Google Analytics Consent-Verknüpfung | Prüfen, ob GA-Skript weiterhin korrekt erst nach Einwilligung lädt |
| Neue Datenschutzerklärung verknüpfen | CCM19 verlinkt auf die Datenschutzseite — nach Textaktualisierung prüfen |
| Cookie-Liste aktualisieren | Alle gesetzten Cookies/Verbindungen im Banner vollständig und korrekt aufgeführt |

### Einordnung Firebase Storage

Firebase Storage setzt **keine Cookies**, stellt aber beim Laden von Bildern
eine Verbindung zu Google-Servern her (IP-Übermittlung).

- **Empfehlung:** Als technisch notwendigen Dienst in CCM19 eintragen
  (kein Opt-in erforderlich, aber Informationspflicht → Datenschutzerklärung genügt)
- Alternativ: Bilder könnten serverseitig proxied werden, damit keine direkte
  Browser-Verbindung zu Google entsteht — erhöht aber Komplexität und ist
  für diesen Use Case nicht erforderlich

---

## Voraussetzungen vor Go-Live

**Firebase & Hosting**
- [ ] Firebase-Projekt auf Region `europe-west3` (Frankfurt) erstellt
- [ ] Google Cloud Data Processing Amendment (DPA/AVV) abgeschlossen
      → Google Cloud Console → IAM → Datenschutz → Datenverarbeitungsvertrag

**Datenschutzerklärung**
- [ ] Abschnitt 10 „Firebase Storage" in `Datenschutz.razor` einfügen (Text siehe oben)
- [ ] Stand-Datum prüfen (`@DateTime.Now` — wird automatisch korrekt angezeigt)

**CCM19 Cookie Banner**
- [ ] Firebase Storage als Dienst in CCM19 eintragen (Kategorie: technisch notwendig)
- [ ] Google Analytics Consent-Trigger nach Migration auf Next.js testen
- [ ] Link zur Datenschutzerklärung im Banner prüfen (URL ändert sich ggf. durch Next.js-Routing)
- [ ] Vollständige Cookie-Liste im Banner auf Aktualität prüfen
