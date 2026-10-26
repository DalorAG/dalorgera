import { useTranslation } from 'react-i18next';

import { LegalDocument, type LegalSection } from '@/components/legal-document';
import { formatDate } from '@/lib/format';

// DRAFT for the MVP (Art. 13 DSGVO). Fill in every [ … ] placeholder in locales/<lang>/legal.json
// and have it legally reviewed before the public launch. Only the German version is binding.
const VERSION = '2026-10-19';

export default function PrivacyScreen() {
  const { t } = useTranslation('legal');
  const sections = t('privacy.sections', { returnObjects: true }) as readonly LegalSection[];
  return (
    <LegalDocument
      title={t('privacy.title')}
      version={formatDate(VERSION)}
      notice={t('privacy.bindingNotice')}
      sections={sections}
    />
  );
}
