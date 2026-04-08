/**
 * AboutPage — Web App
 *
 * Static about page with mission, team, and contact sections.
 * All content from i18n — no data fetching.
 */

import {
  Card,
  Heading,
  Paragraph,
  Stack,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import s from './about.module.css';

export function AboutPage() {
  const t = useT();

  return (
    <div className={s.pageContainer}>
      {/* Hero */}
      <Stack direction="vertical" spacing="var(--ds-size-3)" className={s.headerSection}>
        <Heading level={1} data-size="lg" className={s.title}>
          {t('about.title')}
        </Heading>
        <Paragraph data-size="md" className={s.subtitle}>
          {t('about.description')}
        </Paragraph>
      </Stack>

      {/* Mission */}
      <Card className={s.sectionCard}>
        <Heading level={2} data-size="md" className={s.sectionTitle}>
          {t('about.missionTitle')}
        </Heading>
        <Paragraph data-size="md" className={s.sectionText}>
          {t('about.missionText')}
        </Paragraph>
      </Card>

      {/* Team */}
      <Card className={s.sectionCard}>
        <Heading level={2} data-size="md" className={s.sectionTitle}>
          {t('about.teamTitle')}
        </Heading>
        <Paragraph data-size="md" className={s.sectionText}>
          {t('about.teamText')}
        </Paragraph>
      </Card>

      {/* Contact */}
      <Card className={s.sectionCard}>
        <Heading level={2} data-size="md" className={s.sectionTitle}>
          {t('about.contactTitle')}
        </Heading>
        <Paragraph data-size="md" className={s.sectionText}>
          {t('about.contactText')}
        </Paragraph>
      </Card>
    </div>
  );
}
