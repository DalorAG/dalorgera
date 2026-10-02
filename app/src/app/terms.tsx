import { LegalDocument, type LegalSection } from '@/components/legal-document';
import { formatDate } from '@/lib/format';
import { TERMS_VERSION } from '@/lib/terms';

// DRAFT for the MVP. Replace with legally reviewed terms before the public launch.
const SECTIONS: LegalSection[] = [
  {
    title: '1. Gegenstand',
    body: 'Garantie-Radar hilft dir, Kaufbelege und Garantiescheine digital aufzubewahren und an Garantie- und Gewährleistungsfristen erinnert zu werden.',
  },
  {
    title: '2. Konto',
    body: 'Für die Nutzung ist ein Konto erforderlich. Du bist dafür verantwortlich, deine Zugangsdaten geheim zu halten. Pro Person ist ein Konto vorgesehen.',
  },
  {
    title: '3. Deine Inhalte',
    body: 'Die von dir hochgeladenen Fotos und Angaben bleiben deine Inhalte. Du räumst uns nur die Rechte ein, die nötig sind, um sie zu speichern, zu verarbeiten und dir anzuzeigen.',
  },
  {
    title: '4. Automatische Erkennung',
    body: 'Fotos von Belegen können zur automatischen Erkennung von Händler, Datum und Produkten an einen KI-Dienstleister übermittelt werden. Details findest du in der Datenschutzerklärung. Erkannte Angaben können fehlerhaft sein; bitte prüfe sie vor dem Speichern.',
  },
  {
    title: '5. Fristen und Erinnerungen',
    body: 'Fristen werden aus deinen Angaben berechnet. Sie ersetzen keine rechtliche Beratung. Für die Richtigkeit der Fristen und das rechtzeitige Geltendmachen von Ansprüchen bist du selbst verantwortlich.',
  },
  {
    title: '6. Verfügbarkeit und Haftung',
    body: 'Wir bemühen uns um eine hohe Verfügbarkeit, können diese aber nicht garantieren. Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie nach den gesetzlichen Vorschriften.',
  },
  {
    title: '7. Kündigung',
    body: 'Du kannst dein Konto jederzeit in der App unter „Mehr“ löschen. Dabei werden deine Geräte, Belege und Erinnerungen gelöscht.',
  },
  {
    title: '8. Änderungen',
    body: 'Wenn sich diese Bedingungen ändern, bitten wir dich in der App erneut um deine Zustimmung.',
  },
];

export default function TermsScreen() {
  return <LegalDocument title="Nutzungsbedingungen" version={formatDate(TERMS_VERSION)} sections={SECTIONS} />;
}
