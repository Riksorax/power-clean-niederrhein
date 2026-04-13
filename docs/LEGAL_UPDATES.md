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

| Dienst | Besucher-Kontakt? | Datenschutz-Eintrag nötig? |
|--------|-------------------|--------------------------|
| Firebase Auth | Nein (nur interner Admin-Login) | Nein |
| Firebase Storage | **Ja** (Browser lädt Bilder von Google-Servern) | **Ja** |
| Directus CMS | Nein (rein internes Tool) | Nein |
| .NET API | Ja (bereits als Hoster / Backend abgedeckt) | Kein neuer Abschnitt |

### Einzige notwendige Ergänzung: Abschnitt „Firebase Storage"

Neuer Abschnitt nach dem aktuellen Abschnitt 9 (Google Analytics) einfügen.
Bisheriger Abschnitt 10 (Streitschlichtung) wird zu Abschnitt 11.

```
Abschnitt 10 — Firebase Storage (Bildhosting)

Auf dieser Website werden Bilder über Firebase Storage eingebunden,
einen Dienst der Google Ireland Limited, Gordon House, Barrow Street,
Dublin 4, Irland. Wenn Sie eine Seite mit solchen Bildern aufrufen,
stellt Ihr Browser eine direkte Verbindung zu den Servern von Google her.
Dabei wird unter anderem Ihre IP-Adresse an Google übermittelt.

Zweck: Bereitstellung und schnelle Auslieferung von Bild-Dateien
(Fotos unserer Leistungen und Referenzprojekte).

Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
an der optimalen Darstellung unserer Website).

Speicherort: Das Firebase-Projekt ist in der Region europe-west3
(Frankfurt, Deutschland) gehostet. Die Daten verbleiben innerhalb der EU.

Auftragsverarbeitung: Mit Google Ireland Limited besteht ein Vertrag
zur Auftragsverarbeitung gemäß Art. 28 DSGVO
(Google Cloud Data Processing Amendment).

Weitere Informationen: https://policies.google.com/privacy
```

### Was NICHT erwähnt werden muss

- **Firebase Auth** — nur für interne Admin-Benutzer (1–2 Personen),
  kein Website-Besucher interagiert damit. Kein Eintrag nötig.
- **Directus** — rein internes CMS-Tool, nicht vom Besucher erreichbar.
  Kein Eintrag nötig.
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
