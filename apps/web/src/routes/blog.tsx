/**
 * BlogPage — Web App
 *
 * Lists published guides as blog entries in a grid layout.
 * Each card links to the guide detail page.
 */

import { useNavigate } from 'react-router-dom';
import { Card, Heading, Paragraph, Button, Stack } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useDocsGuidesList } from '@digipicks/sdk';
import { env } from '@digipicks/app-shell';
import s from './blog.module.css';

export function BlogPage() {
  const t = useT();
  const navigate = useNavigate();
  const tenantId = env.tenantId || '';

  const guides = useDocsGuidesList({
    tenantId,
    isPublished: true,
  });

  const items = (guides ?? []) as Array<{
    _id: string;
    slug: string;
    title: string;
    description?: string;
    category?: string;
  }>;

  const isLoading = tenantId !== '' && guides === undefined;

  return (
    <div className={s.pageContainer}>
      {/* Header */}
      <Stack direction="vertical" spacing="var(--ds-size-3)" className={s.headerSection}>
        <Heading level={1} data-size="lg" className={s.title}>
          {t('blog.title')}
        </Heading>
        <Paragraph data-size="md" className={s.subtitle}>
          {t('blog.subtitle')}
        </Paragraph>
      </Stack>

      {/* Guide grid */}
      {isLoading ? (
        <Paragraph>{t('common.loading')}</Paragraph>
      ) : items.length === 0 ? (
        <div className={s.emptyState}>
          <Paragraph className={s.emptyText}>{t('blog.noArticles')}</Paragraph>
        </div>
      ) : (
        <div className={s.guideGrid}>
          {items.map((guide) => (
            <Card key={guide._id} className={s.guideCard}>
              {guide.category && (
                <Paragraph data-size="xs" className={s.guideBadge}>
                  {guide.category}
                </Paragraph>
              )}
              <Heading level={2} data-size="sm" className={s.guideTitle}>
                {guide.title}
              </Heading>
              {guide.description && (
                <Paragraph data-size="sm" className={s.guideDescription}>
                  {guide.description}
                </Paragraph>
              )}
              <Button variant="tertiary" data-size="sm" onClick={() => navigate(`/blog/${guide.slug}`)}>
                {t('blog.readMore')}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
