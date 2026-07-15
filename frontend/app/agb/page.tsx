import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AGB – Power Clean Niederrhein",
  robots: { index: false, follow: true },
};

export default function AgbPage() {
  const date = new Date().toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  return (
    <div className="py-16 bg-off-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white p-8 md:p-12 rounded-lg shadow-sm content-section">
            <h1 className="text-center font-bold text-moss-green mb-10 text-4xl">
              Allgemeine Geschäftsbedingungen
            </h1>
            <p className="text-gray-500 text-sm mb-8">Stand: {date}</p>

            <h2>§ 1 Geltungsbereich</h2>
            <p>
              (1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") gelten für alle
              Verträge über die Erbringung von Reinigungsdienstleistungen, die zwischen der Roth
              &amp; Speulmans Power Clean Niederrhein GbR, Thielenstr. 3, 47574 Goch (nachfolgend
              „Auftragnehmer") und dem Kunden (nachfolgend „Auftraggeber") geschlossen werden.
            </p>
            <p>
              (2) Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des
              Auftraggebers werden nur dann Vertragsbestandteil, wenn der Auftragnehmer ihrer
              Geltung ausdrücklich schriftlich zugestimmt hat.
            </p>
            <p>
              (3) Diese AGB gelten sowohl gegenüber Verbrauchern im Sinne des § 13 BGB als auch
              gegenüber Unternehmern im Sinne des § 14 BGB, sofern nicht ausdrücklich unterschieden
              wird.
            </p>

            <h2>§ 2 Vertragsschluss</h2>
            <p>
              (1) Die Darstellung der Dienstleistungen auf der Website des Auftragnehmers stellt
              kein rechtlich bindendes Angebot, sondern eine Aufforderung zur Abgabe eines Angebots
              (invitatio ad offerendum) dar.
            </p>
            <p>
              (2) Der Auftraggeber gibt ein verbindliches Angebot ab, indem er das Kontaktformular
              auf der Website ausfüllt, eine Anfrage per E-Mail oder telefonisch übermittelt. Der
              Vertrag kommt erst zustande, wenn der Auftragnehmer die Anfrage schriftlich oder in
              Textform (z.&nbsp;B. per E-Mail) bestätigt oder mit der Ausführung der Leistung
              beginnt.
            </p>
            <p>
              (3) Der Auftragnehmer behält sich vor, Angebote ohne Angabe von Gründen abzulehnen.
            </p>

            <h2>§ 3 Leistungsumfang</h2>
            <p>
              (1) Der Auftragnehmer erbringt Reinigungsdienstleistungen im Außenbereich,
              insbesondere Terrassen-, Gehweg-, Balkon-, Auffahrt- und Parkplatzreinigung sowie
              Winterdienst im Servicegebiet Niederrhein. Der genaue Leistungsumfang ergibt sich aus
              der jeweiligen Auftragsbestätigung.
            </p>
            <p>
              (2) Zusatzleistungen, die über den vereinbarten Umfang hinausgehen, bedürfen einer
              gesonderten schriftlichen Vereinbarung und werden gesondert berechnet.
            </p>
            <p>
              (3) Der Auftragnehmer ist berechtigt, Teilleistungen durch qualifizierte
              Subunternehmer erbringen zu lassen, sofern dies dem Auftraggeber vorab mitgeteilt wird
              und keine berechtigten Interessen des Auftraggebers entgegenstehen.
            </p>
            <p>
              (4) Witterungsbedingte Einschränkungen oder Verzögerungen (z.&nbsp;B. Frost,
              Starkregen) liegen außerhalb des Einflussbereichs des Auftragnehmers und begründen
              keinen Anspruch auf Minderung oder Schadensersatz, sofern der Auftragnehmer den
              Auftraggeber unverzüglich informiert und einen Ersatztermin anbietet.
            </p>

            <h2>§ 4 Preise und Zahlung</h2>
            <p>
              (1) Es gelten die im Angebot bzw. in der Auftragsbestätigung ausgewiesenen Preise.
              Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer, sofern nicht
              anders angegeben.
            </p>
            <p>
              (2) Die Vergütung ist nach Erbringung der Leistung fällig. Der Auftragnehmer stellt
              dem Auftraggeber eine Rechnung, die innerhalb von 14 Tagen nach Rechnungsdatum ohne
              Abzug zu begleichen ist, sofern nicht abweichend vereinbart.
            </p>
            <p>
              (3) Bei Zahlungsverzug ist der Auftragnehmer berechtigt, Verzugszinsen in Höhe von 5
              Prozentpunkten über dem jeweiligen Basiszinssatz (§ 288 Abs. 1 BGB) zu berechnen. Das
              Recht zur Geltendmachung eines weitergehenden Schadens bleibt unberührt.
            </p>
            <p>
              (4) Für größere Aufträge kann der Auftragnehmer eine Anzahlung von bis zu 30 % des
              Auftragswertes verlangen. Die Anzahlung ist vor Leistungsbeginn fällig.
            </p>
            <p>
              (5) Eine Aufrechnung durch den Auftraggeber ist nur mit unbestrittenen oder
              rechtskräftig festgestellten Forderungen zulässig.
            </p>

            <h2>§ 5 Stornierung und Absage</h2>
            <p>
              (1) Der Auftraggeber kann einen vereinbarten Termin bis 48 Stunden vor dem geplanten
              Leistungsbeginn kostenfrei stornieren oder verschieben.
            </p>
            <p>
              (2) Bei einer Stornierung weniger als 48 Stunden vor dem vereinbarten Termin ist der
              Auftragnehmer berechtigt, eine Ausfallpauschale in Höhe von 50 % des vereinbarten
              Auftragswertes in Rechnung zu stellen, es sei denn, der Auftraggeber weist nach, dass
              dem Auftragnehmer kein oder ein wesentlich geringerer Schaden entstanden ist.
            </p>
            <p>
              (3) Stornierungen bedürfen der Textform (E-Mail, Nachricht). Telefonische
              Stornierungen sind nur wirksam, wenn sie vom Auftragnehmer schriftlich bestätigt
              werden.
            </p>
            <p>
              (4) Das gesetzliche Widerrufsrecht von Verbrauchern gemäß § 312g BGB
              i.&nbsp;V.&nbsp;m. § 355 BGB bleibt unberührt.
            </p>

            <h2>§ 6 Mitwirkungspflichten des Auftraggebers</h2>
            <p>
              (1) Der Auftraggeber stellt sicher, dass der Auftragnehmer und seine Mitarbeiter zum
              vereinbarten Termin ungehinderten Zugang zur zu reinigenden Fläche erhalten.
            </p>
            <p>
              (2) Der Auftraggeber ist verpflichtet, vor Leistungsbeginn alle Gegenstände, Möbel,
              Pflanzen und sonstige bewegliche Sachen von den zu reinigenden Flächen zu entfernen,
              sofern nicht ausdrücklich etwas anderes vereinbart wurde. Der Auftragnehmer haftet
              nicht für Schäden an Gegenständen, die der Auftraggeber nicht entfernt hat.
            </p>
            <p>
              (3) Der Auftraggeber stellt einen Wasseranschluss und ggf. einen Stromanschluss in
              unmittelbarer Nähe der zu reinigenden Fläche kostenfrei zur Verfügung, sofern dies
              für die Leistungserbringung erforderlich ist.
            </p>
            <p>
              (4) Verzögerungen oder Mehraufwand, die durch fehlende Mitwirkung des Auftraggebers
              entstehen, gehen zu dessen Lasten. Der Auftragnehmer ist berechtigt, entstandenen
              Mehraufwand gesondert in Rechnung zu stellen.
            </p>

            <h2>§ 7 Haftung</h2>
            <p>
              (1) Der Auftragnehmer haftet unbeschränkt für Schäden, die auf einer vorsätzlichen
              oder grob fahrlässigen Pflichtverletzung des Auftragnehmers, seiner gesetzlichen
              Vertreter oder Erfüllungsgehilfen beruhen sowie für Schäden aus der Verletzung des
              Lebens, des Körpers oder der Gesundheit.
            </p>
            <p>
              (2) Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht
              (Kardinalpflicht) ist die Haftung des Auftragnehmers der Höhe nach auf den bei
              Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt.
            </p>
            <p>
              (3) Eine weitergehende Haftung des Auftragnehmers für leicht fahrlässige
              Pflichtverletzungen ist ausgeschlossen.
            </p>
            <p>(4) Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.</p>
            <p>
              (5) Vorschäden oder vorhandene Mängel an den zu reinigenden Flächen (z.&nbsp;B.
              bereits beschädigte Fugen, morsches Holz, lose Platten) sind vor Leistungsbeginn vom
              Auftraggeber zu benennen. Für Schäden an bereits vorgeschädigten Flächen haftet der
              Auftragnehmer nicht, sofern er auf die Vorschäden hingewiesen hat oder diese
              offensichtlich erkennbar waren.
            </p>

            <h2>§ 8 Gewährleistung und Mängelrüge</h2>
            <p>
              (1) Der Auftraggeber ist verpflichtet, die erbrachte Leistung unverzüglich nach
              Fertigstellung zu prüfen und etwaige Mängel dem Auftragnehmer unverzüglich, spätestens
              jedoch innerhalb von 5 Werktagen nach Leistungserbringung, in Textform anzuzeigen.
              Verdeckte Mängel sind unverzüglich nach Entdeckung anzuzeigen.
            </p>
            <p>
              (2) Bei berechtigten Mängelrügen hat der Auftragnehmer das Recht zur Nacherfüllung
              (Nachbesserung). Schlägt die Nacherfüllung zweimal fehl, ist der Auftraggeber
              berechtigt, den Auftragswert zu mindern oder vom Vertrag zurückzutreten.
            </p>
            <p>
              (3) Gewährleistungsansprüche verjähren in 12 Monaten ab Abnahme der Leistung, sofern
              es sich nicht um Ansprüche wegen vorsätzlich oder grob fahrlässig verursachter Schäden
              oder wegen Verletzung von Leib und Leben handelt.
            </p>

            <h2>§ 9 Datenschutz</h2>
            <p>
              Der Auftragnehmer verarbeitet personenbezogene Daten des Auftraggebers ausschließlich
              zur Vertragsabwicklung und im Rahmen der gesetzlichen Vorschriften. Nähere
              Informationen zur Datenverarbeitung entnehmen Sie bitte unserer{" "}
              <Link href="/datenschutz">Datenschutzerklärung</Link>.
            </p>

            <h2>§ 10 Schlussbestimmungen</h2>
            <p>
              (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
              UN-Kaufrechts (CISG). Gegenüber Verbrauchern gilt diese Rechtswahl nur insoweit, als
              dass dem Verbraucher nicht der Schutz entzogen wird, den er nach zwingenden
              Vorschriften des Rechts des Staates seines gewöhnlichen Aufenthalts genießt.
            </p>
            <p>
              (2) Gerichtsstand für alle Streitigkeiten aus und im Zusammenhang mit diesem Vertrag
              ist, soweit gesetzlich zulässig, der Sitz des Auftragnehmers in Goch.
            </p>
            <p>
              (3) Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam oder
              undurchführbar sein oder werden, so wird dadurch die Wirksamkeit der übrigen
              Bestimmungen nicht berührt (Salvatorische Klausel). An die Stelle der unwirksamen
              Bestimmung tritt die gesetzliche Regelung.
            </p>
            <p>
              (4) Änderungen und Ergänzungen dieser AGB bedürfen der Textform. Dies gilt auch für
              die Aufhebung dieses Formerfordernisses.
            </p>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link href="/" className="text-moss-green hover:underline">
                ← Zurück zur Startseite
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
