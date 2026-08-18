/** Rechtstexte — DEUTSCH (Gefälligkeitsübersetzung; die spanische Fassung ist maßgeblich). */
const de = {
  meta: {
    updated: 'Juli 2026',
    updatedLabel: 'Zuletzt aktualisiert',
    courtesy: 'Dies ist eine Gefälligkeitsübersetzung. Bei Abweichungen ist die spanische Fassung maßgeblich.',
  },

  privacy: {
    title: 'Datenschutzerklärung',
    sections: [
      { t: 'Verantwortlicher', b: [
        { p: 'Verantwortlicher für die Verarbeitung deiner personenbezogenen Daten ist **TradingCalculator.pro**, betrieben von {entity}. Bei Datenschutzfragen erreichst du uns unter {email}.' },
      ]},
      { t: 'Vertreter in der Europäischen Union', b: [
        { p: 'Da der Verantwortliche außerhalb des Europäischen Wirtschaftsraums niedergelassen ist und seinen Dienst Personen in der Union anbietet, haben wir einen Vertreter gemäß **Art. 27 DSGVO** benannt. Du kannst dich in allen Fragen der Verarbeitung deiner Daten an ihn oder an uns wenden: {euRepresentative}' },
      ]},
      { t: 'Welche Daten wir erheben', b: [
        { p: 'Wir erheben nur die Daten, die zur Erbringung des Dienstes erforderlich sind:' },
        { list: [
          'Identifikationsdaten: Name und E-Mail-Adresse, angegeben bei der Registrierung oder über die Google-Anmeldung (OAuth).',
          'Nutzungsdaten: besuchte Seiten, genutzte Funktionen (Optionsrechner, Simulationen, Kursverfolgung), Theme- und Spracheinstellungen.',
          'Zahlungsdaten: verarbeitet durch externe Zahlungsdienstleister (Stripe, PayPal, Revolut und NOWPayments für Kryptowährungen). Kartennummern oder Bankdaten speichern wir niemals auf unseren Servern; wir bewahren nur Kunden-/Transaktionskennungen und den Abo-Status auf.',
          'Technische Protokolle (Logs): IP-Adresse, Browsertyp und Betriebssystem, zu Sicherheits- und Diagnosezwecken.',
          'Preisalarm-Daten: konfigurierte Assets und Schwellenwerte, nur wenn du diese Funktion aktivierst.',
          'Trading-Journal- und AI-Trade-Coach-Daten: die von dir freiwillig erfassten Trades und, falls du den AI Trade Coach nutzt, die Parameter der analysierten Strategie.',
        ]},
      ]},
      { t: 'Zwecke der Verarbeitung', b: [
        { p: 'Wir verarbeiten deine Daten zu folgenden Zwecken:' },
        { list: [
          'Diensterbringung: Verwaltung deines Kontos, Zugang zu den Plattform-Tools (Optionsrechner, Echtzeitkurse, Simulationen) und Personalisierung.',
          'Abrechnung und Abo-Verwaltung: Verarbeitung wiederkehrender Zahlungen, Verwaltung der Pläne (17 €/Monat, 45 €/Quartal, 200 €/Jahr, 500 € Lifetime) und Rechnungsstellung.',
          'Transaktionale Kommunikation: Zahlungsbestätigungen, Verlängerungshinweise und von dir konfigurierte Preisalarm-Benachrichtigungen, versendet über SendGrid.',
          'Sicherheit und Betrugsprävention: Erkennung unbefugter Zugriffe und Schutz der Integrität des Dienstes.',
          'Nutzungsanalyse (mit deiner Einwilligung): über Google Analytics 4 mit IP-Anonymisierung, zur Verbesserung der Plattform.',
        ]},
      ]},
      { t: 'Rechtsgrundlagen der Verarbeitung (DSGVO)', b: [
        { p: 'Für Nutzer im Europäischen Wirtschaftsraum stützt sich die Verarbeitung auf folgende Rechtsgrundlagen der Datenschutz-Grundverordnung (DSGVO):' },
        { list: [
          'Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung: Die Verarbeitung ist zur Erbringung des Dienstes, zur Abo-Verwaltung und zur Zahlungsabwicklung erforderlich.',
          'Art. 6 Abs. 1 lit. a DSGVO — Einwilligung: für Analyse-Cookies (Google Analytics 4) und optionale Marketing-Kommunikation. Du kannst deine Einwilligung jederzeit widerrufen.',
          'Art. 6 Abs. 1 lit. c DSGVO — Rechtliche Verpflichtung: Aufbewahrung von Abrechnungsdaten gemäß geltendem Steuerrecht.',
          'Art. 6 Abs. 1 lit. f DSGVO — Berechtigtes Interesse: Sicherheit des Dienstes und Betrugsprävention.',
        ]},
      ]},
      { t: 'Empfänger deiner Daten', b: [
        { p: 'Wir geben Daten nur im erforderlichen Umfang an folgende Dienstleister weiter:' },
        { list: [
          'Stripe, Inc. (Karten- und SEPA-Zahlungen): verarbeitet Abo-Zahlungen und agiert für Zahlungsdaten als eigenständiger Verantwortlicher. Richtlinie: stripe.com/privacy.',
          'PayPal, Inc. (Zahlungen): verarbeitet PayPal-Zahlungen gemäß eigener Datenschutzrichtlinie.',
          'Revolut (Revolut Pay, inkl. Apple Pay/Google Pay im Checkout): verarbeitet Zahlungen mit Revolut Pay.',
          'NOWPayments (Krypto-Zahlungen): verarbeitet Zahlungen in Kryptowährungen. Erhält Betrag, Bestellkennung und ggf. deine E-Mail für den Beleg.',
          'Google LLC (OAuth und Analytics): Die Google-Anmeldung überträgt Name und E-Mail. Google Analytics 4 wird mit IP-Anonymisierung und nur mit deiner Einwilligung genutzt. Richtlinie: policies.google.com/privacy.',
          'PostHog (Produktanalyse und Sitzungsaufzeichnung): zeichnet anonym auf, wie die App bedient wird — Klicks, Routen und Fehler —, um Störungen zu diagnostizieren und die Oberfläche zu verbessern. Nur aktiv, wenn du nicht-essenzielle Cookies akzeptierst.',
          'Twilio SendGrid (Transaktions-E-Mails): Versand von Bestätigungen, Rechnungen und Alarmen. Erhält nur deine E-Mail-Adresse.',
          'Anthropic (AI Trade Coach): Wenn du eine KI-Analyse anforderst, werden die Parameter der analysierten Strategie (Asset, Trade-Legs, Preise) an Anthropic gesendet. Name und E-Mail werden nicht mitgesendet.',
        ]},
        { p: 'Die Anbieter sind durch Auftragsverarbeitungsverträge gebunden oder stützen sich auf gültige Mechanismen für internationale Datenübermittlungen (Standardvertragsklauseln oder andere anerkannte Mechanismen).' },
      ]},
      { t: 'Deine Rechte als betroffene Person (DSGVO)', b: [
        { p: 'Befindest du dich in der EU/im EWR, stehen dir folgende Rechte zu:' },
        { list: [
          'Auskunftsrecht (Art. 15 DSGVO): eine Kopie der über dich verarbeiteten Daten anfordern.',
          'Recht auf Berichtigung (Art. 16 DSGVO): unrichtige oder unvollständige Daten jederzeit in den Kontoeinstellungen korrigieren.',
          'Recht auf Löschung (Art. 17 DSGVO): Löschung deines Kontos und deiner Daten verlangen, sofern keine gesetzliche Aufbewahrungspflicht besteht.',
          'Recht auf Datenübertragbarkeit (Art. 20 DSGVO): einen Export deiner Daten in einem strukturierten, maschinenlesbaren Format anfordern.',
          'Widerspruchsrecht (Art. 21 DSGVO): der Verarbeitung auf Grundlage berechtigten Interesses jederzeit widersprechen.',
          'Recht auf Widerruf der Einwilligung: ohne dass die Rechtmäßigkeit der bisherigen Verarbeitung berührt wird.',
          'Beschwerderecht bei der Aufsichtsbehörde deines EU-Wohnsitzlandes (in Spanien: AEPD).',
        ]},
        { p: 'Zur Ausübung dieser Rechte sende eine E-Mail an {email} und nenne das gewünschte Recht. Wir antworten innerhalb von 30 Tagen.' },
      ]},
      { t: 'Speicherfristen', b: [
        { list: [
          'Kontodaten (Name, E-Mail, Einstellungen): solange das Konto aktiv ist. Löschung innerhalb von 30 Tagen nach Löschantrag.',
          'Technische Protokolle: 90 Tage, zu Sicherheits- und Diagnosezwecken.',
          'Zahlungs- und Abrechnungsdaten: so lange, wie es steuer- und handelsrechtliche Pflichten verlangen (je nach Rechtsordnung bis zu 10 Jahre).',
          'Analysedaten (Google Analytics 4): höchstens 14 Monate, mit anonymisierter IP.',
        ]},
      ]},
      { t: 'Datensicherheit', b: [
        { p: 'Wir treffen geeignete technische und organisatorische Maßnahmen zum Schutz deiner Daten vor unbefugtem Zugriff, Verlust oder Offenlegung: Verschlüsselung bei der Übertragung (TLS/HTTPS), rollenbasierte Zugriffskontrolle und regelmäßige Sicherheitsüberprüfungen. Zahlungen sind durch die PCI-DSS-Infrastruktur der Zahlungsdienstleister geschützt.' },
      ]},
      { t: 'Internationale Datenübermittlungen', b: [
        { p: 'Das Unternehmen ist in den Vereinigten Staaten ansässig; einige Anbieter (Google, Stripe, SendGrid, Anthropic) verarbeiten Daten außerhalb des EWR. In diesen Fällen stellen wir geeignete Garantien sicher, etwa von der Europäischen Kommission genehmigte Standardvertragsklauseln oder andere gültige Übermittlungsmechanismen.' },
      ]},
      { t: 'Cookies', b: [
        { p: 'Wir verwenden Cookies und ähnliche Technologien. Einzelheiten findest du in unserer Cookie-Richtlinie im entsprechenden Tab dieser Seite.' },
      ]},
    ],
  },

  terms: {
    title: 'Nutzungsbedingungen',
    sections: [
      { t: 'Annahme der Bedingungen', b: [
        { p: 'Mit dem Zugriff auf und der Nutzung von TradingCalculator.pro (der „Dienst“) erklärst du dich an diese Nutzungsbedingungen gebunden. Bist du mit einer Bedingung nicht einverstanden, musst du von der Nutzung absehen. Diese Bedingungen bilden eine rechtsverbindliche Vereinbarung zwischen dir und {entity} (das „Unternehmen“).' },
      ]},
      { t: 'Art des Dienstes — Keine Finanzberatung', b: [
        { p: 'TradingCalculator.pro ist eine Plattform mit Finanzinformations-Tools: Optionsrechner (Black-Scholes, Griechen), Echtzeitkurse und Strategiesimulationen. Der Dienst hat ausschließlich informativen und bildenden Charakter.' },
        { p: '**WICHTIGER HINWEIS: TradingCalculator.pro erbringt KEINE Finanz-, Anlage-, Steuer- oder Rechtsberatung. Kein Inhalt der Plattform ist als Empfehlung zum Kauf, Verkauf oder Halten eines Finanzinstruments zu verstehen.**' },
        { p: 'Vergangene Ergebnisse garantieren keine zukünftigen Ergebnisse. Jede Anlage in Finanzinstrumente, einschließlich Optionen, birgt ein erhebliches Verlustrisiko bis hin zum Totalverlust. Für deine Anlageentscheidungen bist allein du verantwortlich. Konsultiere vor dem Handel einen professionellen Finanzberater.' },
      ]},
      { t: 'Registrierung und Nutzerkonto', b: [
        { p: 'Für die Nutzung der Plattformfunktionen ist ein Konto erforderlich. Du bist für die Vertraulichkeit deiner Zugangsdaten und alle Aktivitäten unter deinem Konto verantwortlich. Melde uns unbefugte Nutzung unverzüglich unter {email}. Du musst mindestens 18 Jahre alt sein.' },
      ]},
      { t: 'Abonnements, kostenlose Testphase und Zahlungen', b: [
        { p: 'Verfügbare Pläne:' },
        { list: [
          'Monatsplan: 17 €/Monat, automatische monatliche Verlängerung.',
          'Quartalsplan: 45 €/Quartal, automatische Verlängerung alle 3 Monate.',
          'Jahresplan: 200 €/Jahr, automatische Verlängerung alle 12 Monate.',
          'Lifetime-Plan: 500 €, Einmalzahlung, dauerhafter Zugang ohne Verlängerungen.',
        ]},
        { p: '**7-tägige kostenlose Testphase** (nur wiederkehrende Pläne, nur Neukunden): Zum Start ist eine gültige Zahlungsmethode erforderlich. Kündigst du nicht vor Ablauf der Testphase, erfolgt automatisch die erste Abbuchung des gewählten Plans. Während der Testphase kannst du kostenfrei unter „Mein Abo“ kündigen.' },
        { p: 'Zahlungen werden sicher über **Stripe** (Karte, SEPA, Klarna sowie Wallets wie Apple Pay/Google Pay), **PayPal**, **Revolut Pay** und **NOWPayments** (Kryptowährungen) abgewickelt. Preise sind in Euro (EUR) angegeben und enthalten ggf. anfallende Steuern. Mit einem Abo mit automatischer Verlängerung autorisierst du wiederkehrende Abbuchungen, bis du kündigst. Eine Kündigung ist jederzeit unter „Mein Abo“ möglich; der Zugang bleibt bis zum Ende des laufenden Abrechnungszeitraums bestehen.' },
      ]},
      { t: 'Widerrufsrecht (Verbraucher in der EU)', b: [
        { p: 'Als Verbraucher mit Wohnsitz in der Europäischen Union hast du **14 Kalendertage ab Vertragsschluss** Zeit, den Vertrag **ohne Angabe von Gründen und ohne Nachteile** zu widerrufen. Dieses Recht besteht unabhängig von und zusätzlich zu der unten beschriebenen kommerziellen Erstattungsregelung und darf nicht davon abhängig gemacht werden, wie intensiv du den Dienst genutzt hast.' },
        { p: 'Zur Ausübung genügt eine eindeutige Erklärung — etwa eine E-Mail an {email} mit Name, Kaufdatum und Tarif — vor Ablauf der Frist. Du kannst das Formular im nächsten Abschnitt verwenden, musst es aber nicht. Wir bestätigen den Eingang unverzüglich.' },
        { p: '**Erstattung.** Wir erstatten alle erhaltenen Zahlungen unverzüglich und in jedem Fall **binnen 14 Tagen** ab Zugang deiner Erklärung, über dasselbe Zahlungsmittel, das du verwendet hast, ohne Kosten für dich. Bei Zahlungen mit Kryptowährungen, die unumkehrbar sind, wird der entsprechende Betrag in Euro auf anderem Weg erstattet.' },
        { p: '**Sofortiger Zugang und Erlöschen des Rechts.** Der Dienst ist sofort verfügbarer digitaler Inhalt. Beim Kauf wirst du gebeten, ausdrücklich zuzustimmen, dass die Leistung sofort beginnt, und zu bestätigen, dass **das Widerrufsrecht mit vollständiger Erbringung erlischt** (Art. 16 Buchst. m der Richtlinie 2011/83/EU). Ohne diese Zustimmung beginnt die Leistung erst nach Ablauf der 14 Tage. Widerrufst du nach erteilter Zustimmung, berechnen wir nur den bereits erbrachten Anteil.' },
        { p: 'Zwingende Verbraucherrechte nach dem Recht deines Wohnsitzlandes bleiben davon unberührt.' },
      ]},
      { t: 'Muster-Widerrufsformular', b: [
        { p: 'Fülle dieses Formular nur aus, wenn du den Vertrag widerrufen möchtest. Die Verwendung ist nicht verpflichtend.' },
        { list: [
          'An TradingCalculator.pro, {email}:',
          'Hiermit widerrufe ich meinen Vertrag über die Erbringung der folgenden Dienstleistung: [gebuchter Tarif].',
          'Datum des Vertragsschlusses: [Datum].',
          'Name des Verbrauchers: [Name].',
          'Anschrift des Verbrauchers: [Anschrift].',
          'E-Mail-Adresse des Kontos: [E-Mail].',
          'Datum: [Datum dieser Erklärung].',
        ]},
      ]},
      { t: 'Erstattungsrichtlinie', b: [
        { list: [
          'Monatsplan (17 €/Monat): volle Erstattung innerhalb der ersten 14 Kalendertage nach Aktivierung, sofern du die Premium-Funktionen nicht wesentlich genutzt hast.',
          'Quartalsplan (45 €/Quartal): volle Erstattung innerhalb der ersten 14 Kalendertage, unter denselben Bedingungen.',
          'Jahresplan (200 €/Jahr): volle Erstattung innerhalb der ersten 14 Kalendertage, unter denselben Bedingungen.',
          'Lifetime-Plan (500 €): nach Zahlung nicht erstattungsfähig, unbeschadet unverzichtbarer Verbraucherrechte nach dem Recht deines Wohnsitzlandes.',
        ]},
        { p: 'Für eine Erstattung kontaktiere uns innerhalb der geltenden Frist unter {email}. Erstattungen erfolgen innerhalb von 5–10 Werktagen auf die ursprüngliche Zahlungsmethode. **Krypto-Zahlungen:** Da diese Transaktionen unumkehrbar sind, werden genehmigte Erstattungen in Euro über einen gleichwertigen alternativen Weg ausgezahlt. Diese Richtlinie beschränkt nicht deine Verbraucherrechte nach dem Recht deines EU-Wohnsitzlandes.' },
      ]},
      { t: 'Geistiges Eigentum', b: [
        { p: 'Sämtliche Inhalte des Dienstes — einschließlich Quellcode, Algorithmen, Interface-Design, Texte, Grafiken, Logos und Datenbanken — sind ausschließliches Eigentum des Unternehmens und durch geltendes Immaterialgüterrecht geschützt. Dir wird eine beschränkte, nicht ausschließliche, nicht übertragbare und widerrufliche Lizenz zur rein persönlichen, nicht kommerziellen Nutzung eingeräumt.' },
      ]},
      { t: 'Verbotene Nutzungen', b: [
        { p: 'Ausdrücklich untersagt sind:' },
        { list: [
          'Reverse Engineering, Dekompilierung oder Zerlegung jeglicher Teile des Dienstes.',
          'Einsatz von Scrapern, Bots, Crawlern oder anderen automatisierten Tools zur Datenextraktion.',
          'Weiterverkauf, Unterlizenzierung oder Weiterverbreitung des Dienstes oder seiner Inhalte an Dritte.',
          'Unbefugte Zugriffsversuche auf Systeme oder Daten des Dienstes.',
          'Nutzung des Dienstes für illegale, betrügerische oder Rechte Dritter verletzende Aktivitäten.',
          'Weitergabe von Zugangsdaten oder gleichzeitige Nutzung deines Kontos durch mehrere Personen.',
          'Absichtliche Überlastung der Infrastruktur durch Massenanfragen oder Denial-of-Service-Angriffe.',
        ]},
        { p: 'Verstöße können zur sofortigen Sperrung oder Kündigung deines Kontos ohne Erstattung sowie zu rechtlichen Schritten führen.' },
      ]},
      { t: 'Verfügbarkeit und Haftungsbeschränkung', b: [
        { p: 'Wir bemühen uns um durchgehende Verfügbarkeit, garantieren jedoch keine 100%ige Verfügbarkeit. Unterbrechungen durch geplante Wartung, technische Störungen oder höhere Gewalt sind möglich.' },
        { p: 'Soweit gesetzlich zulässig haftet das Unternehmen nicht für indirekte, beiläufige, besondere, Folge- oder Strafschäden aus der Nutzung des Dienstes, einschließlich finanzieller Verluste aus Anlageentscheidungen. Die Gesamthaftung ist auf den Betrag beschränkt, den du in den 12 Monaten vor dem anspruchsbegründenden Ereignis gezahlt hast.' },
      ]},
      { t: 'Änderungen', b: [
        { p: 'Wir behalten uns vor, diese Bedingungen jederzeit zu ändern. Wesentliche Änderungen kündigen wir mindestens 15 Tage im Voraus per E-Mail oder Plattform-Hinweis an. Die fortgesetzte Nutzung nach Inkrafttreten gilt als Zustimmung.' },
      ]},
      { t: 'Anwendbares Recht und Gerichtsstand', b: [
        { p: 'Diese Bedingungen unterliegen dem Recht der Vereinigten Staaten und ggf. dem Recht des Gründungsstaates des Unternehmens, unbeschadet zwingender Verbraucherschutzvorschriften deines Wohnsitzlandes (insbesondere innerhalb der EU). Streitigkeiten, die sich nicht gütlich beilegen lassen, werden vor den nach geltendem Recht zuständigen Gerichten ausgetragen.' },
      ]},
    ],
  },

  cookies: {
    title: 'Cookie-Richtlinie',
    sections: [
      { t: 'Was sind Cookies?', b: [
        { p: 'Cookies sind kleine Textdateien, die beim Besuch einer Website auf deinem Gerät gespeichert werden. Sie ermöglichen es der Website, deine Aktionen und Einstellungen für eine gewisse Zeit zu speichern, damit du bestimmte Angaben nicht bei jedem Seitenwechsel erneut eingeben musst.' },
      ]},
      { t: 'Technische und essenzielle Cookies (keine Einwilligung erforderlich)', b: [
        { p: 'Diese Cookies sind für den Grundbetrieb des Dienstes (sichere Authentifizierung) zwingend erforderlich. Es sind httpOnly-Cookies: Kein Browser-Skript kann sie auslesen.' },
        { table: {
          head: ['Cookie', 'Zweck', 'Dauer'],
          rows: [
            ['access_token', 'Deine Sitzung authentifiziert halten (Access-Token, httpOnly)', '1 Stunde'],
            ['refresh_token', 'Sitzung ohne erneutes Login erneuern (httpOnly)', '7 Tage'],
          ],
        }},
        { p: 'Zusätzlich nutzen wir **lokalen Browser-Speicher (localStorage — keine Cookies)**, um Einstellungen auf deinem Gerät zu speichern: gewählte Sprache, Theme, deine Cookie-Einwilligung und den UI-Zustand deines Kontos. Diese Daten werden nicht an Dritte übertragen.' },
      ]},
      { t: 'Analyse-Cookies (Einwilligung erforderlich)', b: [
        { p: 'Wir nutzen Google Analytics 4, um die Nutzung des Dienstes zu verstehen und ihn zu verbessern. Diese Cookies werden nur gesetzt, wenn du über das Cookie-Banner eingewilligt hast (Google Consent Mode v2, standardmäßig abgelehnt).' },
        { table: {
          head: ['Cookie', 'Anbieter', 'Zweck', 'Dauer'],
          rows: [
            ['_ga', 'Google Analytics', 'Eindeutige Nutzer unterscheiden (anonymisierte ID)', '12 Monate'],
            ['_ga_*', 'Google Analytics', 'Status der Analyse-Sitzung aufrechterhalten', '12 Monate'],
            ['ph_*', 'PostHog', 'Produktanalyse und Sitzungsaufzeichnung (Klicks, Routen, Fehler)', '12 Monate'],
          ],
        }},
        { p: 'Google Analytics 4 ist mit IP-Anonymisierung konfiguriert: Die IP-Adresse wird vor der Speicherung gekürzt. Über diese Cookies werden keine personenbezogenen Informationen an Google übertragen.' },
      ]},
      { t: 'Eingebettete Inhalte Dritter', b: [
        { p: 'Einige Seiten betten den **TradingView**-Chart über ein iframe von tradingview.com ein. Diese Inhalte liefert TradingView aus; dabei können eigene technische Cookies gemäß der TradingView-Richtlinien gesetzt werden. Auf diese Cookies haben wir keinen Einfluss.' },
      ]},
      { t: 'Werbe- und Dritt-Tracking-Cookies', b: [
        { p: '**Wir zeigen keine Werbung Dritter und teilen keine Daten mit Werbenetzwerken; Werbe- und Retargeting-Cookies setzen wir nicht ein.** Wir nutzen jedoch **PostHog** (Produktanalyse und Sitzungsaufzeichnung), um die Nutzung der Plattform zu verstehen und Fehler zu erkennen; es wird nur aktiviert, wenn du nicht-essenzielle Cookies akzeptierst, und du kannst es über das Banner ablehnen.' },
      ]},
      { t: 'Cookies verwalten und deaktivieren', b: [
        { p: 'Die meisten Browser erlauben die Cookie-Verwaltung in den Einstellungen:' },
        { list: [
          'Google Chrome: Einstellungen → Datenschutz und Sicherheit → Cookies und andere Websitedaten.',
          'Mozilla Firefox: Einstellungen → Datenschutz & Sicherheit → Cookies und Website-Daten.',
          'Safari: Einstellungen → Datenschutz → Websitedaten verwalten.',
          'Microsoft Edge: Einstellungen → Datenschutz, Suche und Dienste → Cookies und Websiteberechtigungen.',
        ]},
        { p: 'Das Blockieren essenzieller Cookies kann die Anmeldung verhindern. Um speziell Google Analytics abzulehnen, kannst du das [Browser-Add-on zur Deaktivierung von Google Analytics](https://tools.google.com/dlpage/gaoptout) installieren.' },
      ]},
      { t: 'Einwilligung und Einstellungen', b: [
        { p: 'Beim ersten Besuch erscheint ein Banner, mit dem du nicht essenzielle Cookies annehmen oder ablehnen kannst; deine Wahl wird auf deinem Gerät gespeichert. Du kannst deine Einstellungen jederzeit ändern, indem du die Websitedaten im Browser löschst oder uns unter {email} kontaktierst. Der Widerruf berührt nicht die Rechtmäßigkeit der bisherigen Verarbeitung.' },
      ]},
      { t: 'Aktualisierungen dieser Richtlinie', b: [
        { p: 'Wir können diese Cookie-Richtlinie bei neuen Technologien oder geänderter Rechtslage aktualisieren. Über wesentliche Änderungen informieren wir per Plattform-Hinweis oder E-Mail. Das Datum „Zuletzt aktualisiert“ zeigt die letzte Überarbeitung.' },
      ]},
    ],
  },

  risk: {
    title: 'Risikohinweis',
    sections: [
      { t: 'Die Daten sprechen für sich', b: [
        { p: '**Der Handel an den Finanzmärkten birgt ein hohes Verlustrisiko. Die große Mehrheit der Privatanleger verliert Geld.** Bevor du echtes Geld einsetzt, solltest du diese verifizierten, unabhängigen Zahlen kennen. Sie sind nicht unsere Meinung, sondern Zahlen von Aufsichtsbehörden und akademischen Studien.' },
        { stat: { fig: '74–89%', text: 'der **Retail-CFD-Konten verlieren Geld**, laut der europäischen Aufsicht (ESMA). Der durchschnittliche Verlust pro Kunde liegt zwischen 1.600 € und 29.000 €. Deshalb muss jeder Broker diesen Prozentsatz per Gesetz in seiner Werbung ausweisen.' } },
        { stat: { fig: '97%', text: 'derjenigen, die **mehr als 300 Tage Daytrading** betrieben, verloren Geld (Studie zum brasilianischen Futures-Markt, 2013–2015). Nur 1,1% verdienten mehr als den Mindestlohn und nur 0,5% mehr als das Einstiegsgehalt eines Bankangestellten. Die Autoren folgern, es sei „praktisch unmöglich, vom Daytrading zu leben“.' } },
        { stat: { fig: '<1%', text: 'der Daytrader sind **konsistent und vorhersagbar** profitabel, laut klassischen Studien zum Markt in Taiwan (Barber & Odean); rund 80% verlieren Geld.' } },
      ]},
      { t: 'Was das für dich bedeutet', b: [
        { list: [
          'Dauerhafte Profitabilität im Retail-Trading ist selten: Weniger als 1–3% erreichen sie langfristig.',
          'Vergangene Ergebnisse garantieren keine zukünftigen Ergebnisse.',
          'Du kannst dein gesamtes eingesetztes Kapital verlieren. Bei Hebelprodukten (CFDs, Futures, Optionen) können Verluste sehr schnell eintreten und sogar die Einlage übersteigen.',
          'Kosten (Kommissionen, Spreads, Slippage und Steuern) wirken kumulativ gegen dich.',
          'Psychologische Faktoren und Verhaltensverzerrungen (Selbstüberschätzung, Revenge-Trading, Overtrading) verschlechtern die Ergebnisse der meisten.',
        ]},
      ]},
      { t: 'Unsere Haltung', b: [
        { p: '**TradingCalculator.pro bietet Informations- und Bildungstools — keine Finanzberatung, keine Signale, keine Renditeversprechen.** Wir zeigen diese Zahlen, damit du auf Basis wahrer Informationen entscheidest. Handle nur mit Geld, dessen Verlust du dir leisten kannst, und ziehe bei Bedarf einen zugelassenen Finanzberater hinzu. Siehe auch unsere {terms}.' },
      ]},
      { t: 'Quellen', b: [
        { list: [
          'ESMA (Europäische Wertpapier- und Marktaufsichtsbehörde) — Produktinterventionsmaßnahmen zu CFDs: [esma.europa.eu](https://www.esma.europa.eu/press-news/esma-news/esma-adopts-final-product-intervention-measures-cfds-and-binary-options).',
          'Chague, De-Losso & Giovannetti (2020), „Day Trading for a Living?“ — FGV/USP: [papers.ssrn.com](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101).',
          'Barber, Lee, Liu & Odean — Untersuchungen zur Performance von Daytradern am Markt in Taiwan.',
        ]},
      ]},
    ],
  },
};

export default de;
