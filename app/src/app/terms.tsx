import { useTranslation } from 'react-i18next';

import { LegalDocument, type LegalSection } from '@/components/legal-document';
import { formatDate } from '@/lib/format';
import { TERMS_VERSION } from '@/lib/terms';

// DRAFT for the MVP. Replace with legally reviewed terms before the public launch.
// The text lives in locales/<lang>/legal.json; only the German version is binding.
export default function TermsScreen() {
  const { t } = useTranslation('legal');
  const sections = t('terms.sections', { returnObjects: true }) as readonly LegalSection[];
  return (
    <LegalDocument
      title={t('terms.title')}
      version={formatDate(TERMS_VERSION)}
      notice={t('terms.bindingNotice')}
      sections={sections}
    />
  );
}
