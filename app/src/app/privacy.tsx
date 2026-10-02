import { LegalDocument, type LegalSection } from '@/components/legal-document';

// DRAFT for the MVP (Art. 13 DSGVO). Fill in every [ … ] placeholder and have it
// legally reviewed before the public launch.
const VERSION = '02.10.2026';

const SECTIONS: LegalSection[] = [
  {
    title: '1. Verantwortlicher',
    body: [
      'Verantwortlich für die Verarbeitung deiner Daten in Garantie-Radar ist:',
      '[Name bzw. Firma]\n[Straße, Hausnummer]\n[PLZ, Ort]\nE-Mail: [Kontakt-E-Mail]',
      'Bei Fragen zum Datenschutz erreichst du uns unter [Datenschutz-E-Mail].',
    ],
  },
  {
    title: '2. Welche Daten wir verarbeiten',
    body: [
      '• Kontodaten: E-Mail-Adresse und Passwort (nur verschlüsselt gespeichert). Bei Anmeldung mit Google zusätzlich Name, E-Mail-Adresse und Google-Kennung, die Google uns übermittelt.',
      '• Geräte: Name, Kategorie, Marke, Händler, Kaufdatum, Preis und Notizen, die du eingibst.',
      '• Belege: Fotos von Kassenbons, Rechnungen und Garantiescheinen. Sie können weitere Angaben enthalten, z. B. deinen Namen, die Filiale oder Teile einer Kartennummer.',
      '• Erkannte Angaben: Händler, Kaufdatum, Produkte und Preise, die aus einem Foto ausgelesen wurden.',
      '• Push-Token deines Geräts, um dir Erinnerungen zu senden.',
      '• Deine Zustimmung zu den Nutzungsbedingungen (Version und Zeitpunkt).',
      '• Technische Daten beim Aufruf unserer Server (z. B. IP-Adresse, Zeitpunkt, Fehlermeldungen).',
    ],
  },
  {
    title: '3. Zwecke und Rechtsgrundlagen',
    body: [
      '• Bereitstellung der App, deines Kontos, der Ablage deiner Belege und der Fristberechnung: zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
      '• Erinnerungen per Push-Benachrichtigung: ebenfalls zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO). Du kannst Benachrichtigungen jederzeit in den Einstellungen deines Telefons ausschalten.',
      '• Automatische Erkennung von Belegen, wenn du ein Foto aufnimmst oder auswählst: zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).',
      '• Nachweis deiner Zustimmung zu den Nutzungsbedingungen sowie Sicherheit und Fehlersuche: aufgrund unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO).',
      'Wir verkaufen deine Daten nicht und nutzen sie nicht für Werbung.',
    ],
  },
  {
    title: '4. Empfänger und Dienstleister',
    body: [
      'Wir setzen folgende Dienstleister ein, die deine Daten in unserem Auftrag verarbeiten:',
      '• Supabase Inc. (USA): Anmeldung, Datenbank und Speicherung der Fotos. Die Daten liegen auf Servern in London (Vereinigtes Königreich).',
      '• OpenAI, L.L.C. (USA): automatische Erkennung von Belegen. Dafür wird das Foto des Belegs über einen zeitlich begrenzten Link an OpenAI übermittelt und dort ausgewertet.',
      '• Expo / 650 Industries, Inc. (USA): Zustellung von Push-Benachrichtigungen, zusammen mit Apple (iOS) bzw. Google (Android).',
      '• Google Ireland Ltd.: nur wenn du dich mit Google anmeldest. Für die Anmeldung bei Google gilt die Datenschutzerklärung von Google.',
      '[Hier eintragen, mit welchen Dienstleistern ein Auftragsverarbeitungsvertrag (Art. 28 DSGVO) geschlossen wurde.]',
    ],
  },
  {
    title: '5. Übermittlung in Drittländer',
    body: [
      'Für das Vereinigte Königreich besteht ein Angemessenheitsbeschluss der EU-Kommission.',
      'Bei Dienstleistern in den USA erfolgt die Übermittlung auf Grundlage des EU-US Data Privacy Framework, soweit der Dienstleister zertifiziert ist, und im Übrigen auf Grundlage von EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO).',
      '[Vor Veröffentlichung je Dienstleister prüfen und eintragen, welche Grundlage gilt.]',
    ],
  },
  {
    title: '6. Speicherdauer',
    body: [
      'Geräte, Belege, erkannte Angaben und Erinnerungen speichern wir, bis du sie löschst oder dein Konto löschst.',
      'Wenn du dein Konto in der App unter „Mehr“ löschst, werden dein Konto, alle Geräte, Fotos, Erinnerungen und Push-Token sofort gelöscht.',
      'Server-Protokolle werden nach [Anzahl] Tagen gelöscht. Gesetzliche Aufbewahrungspflichten bleiben unberührt.',
    ],
  },
  {
    title: '7. Deine Rechte',
    body: [
      'Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO).',
      'Wende dich dazu an [Datenschutz-E-Mail]. Dein Konto kannst du jederzeit selbst in der App löschen.',
      'Du hast außerdem das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, z. B. bei der Behörde deines Wohnorts oder bei [zuständige Aufsichtsbehörde].',
    ],
  },
  {
    title: '8. Pflicht zur Bereitstellung',
    body: 'Für ein Konto benötigen wir deine E-Mail-Adresse. Alle weiteren Angaben und Fotos sind freiwillig; ohne sie können wir dir aber keine Fristen berechnen oder Belege aufbewahren.',
  },
  {
    title: '9. Keine automatisierten Entscheidungen',
    body: 'Wir treffen keine Entscheidungen, die ausschließlich auf automatisierter Verarbeitung beruhen und dir gegenüber rechtliche Wirkung entfalten (Art. 22 DSGVO). Die automatische Erkennung macht nur Vorschläge, die du vor dem Speichern prüfst.',
  },
  {
    title: '10. Kamera, Fotos und Benachrichtigungen',
    body: 'Die App greift nur auf Kamera und Fotos zu, wenn du selbst einen Beleg aufnimmst oder auswählst, und nur nachdem du den Zugriff erlaubt hast. Benachrichtigungen senden wir nur mit deiner Erlaubnis.',
  },
  {
    title: '11. Änderungen',
    body: 'Wir passen diese Datenschutzerklärung an, wenn sich die App oder die Rechtslage ändert. Die aktuelle Fassung findest du jederzeit in der App.',
  },
];

export default function PrivacyScreen() {
  return <LegalDocument title="Datenschutzerklärung" version={VERSION} sections={SECTIONS} />;
}
