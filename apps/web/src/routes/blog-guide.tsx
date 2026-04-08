/**
 * BlogGuidePage — Web App
 *
 * Displays a single guide with its sections and article links.
 * URL: /blog/:guideSlug
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Stack,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useDocsGuide } from '@digilist-saas/sdk';
import { env } from '@digilist-saas/app-shell';
import s from './blog.module.css';

interface Section {
  _id: string;
  title: string;
  description?: string;
  articles?: Array<{
    _id: string;
    slug: string;
    title: string;
    description?: string;
  }>;
}

export function BlogGuidePage() {
  const t = useT();
  const navigate = useNavigate();
  const { guideSlug } = useParams<{ guideSlug: string }>();
  const tenantId = env.tenantId || '';

  const guide = useDocsGuide(
    tenantId && guideSlug ? { tenantId, slug: guideSlug } : 'skip'
  ) as {
    _id: string;
    title: string;
    description?: string;
    sections?: Section[];
  } | null | undefined;

  const isLoading = tenantId !== '' && guideSlug !== undefined && guide === undefined;

  if (isLoading) {
    return (
      <div className={s.pageContainer}>
        <Paragraph>{t('common.loading')}</Paragraph>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className={s.pageContainer}>
        <div className={s.emptyState}>
          <Paragraph className={s.emptyText}>
            {t('blog.noArticles')}
          </Paragraph>
          <Button variant="tertiary" onClick={() => navigate('/blog')}>
            {t('blog.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.pageContainer}>
      {/* Back link */}
      <Button
        variant="tertiary"
        data-size="sm"
        onClick={() => navigate('/blog')}
        style={{ marginBottom: 'var(--ds-size-4)' }}
      >
        {t('blog.backToList')}
      </Button>

      {/* Guide header */}
      <Stack direction="vertical" spacing="var(--ds-size-3)" className={s.headerSection}>
        <Heading level={1} data-size="lg" className={s.title}>
          {guide.title}
        </Heading>
        {guide.description && (
          <Paragraph data-size="md" className={s.subtitle}>
            {guide.description}
          </Paragraph>
        )}
      </Stack>

      {/* Sections */}
      <Stack direction="vertical" spacing="var(--ds-size-5)">
        {(guide.sections ?? []).map((section) => (
          <Card key={section._id} className={s.guideCard}>
            <Heading level={2} data-size="sm" className={s.guideTitle}>
              {section.title}
            </Heading>
            {section.description && (
              <Paragraph data-size="sm" className={s.guideDescription}>
                {section.description}
              </Paragraph>
            )}
            {(section.articles ?? []).length > 0 && (
              <Stack direction="vertical" spacing="var(--ds-size-1)">
                {section.articles!.map((article) => (
                  <Link
                    key={article._id}
                    to={`/blog/${guideSlug}/${article.slug}`}
                    className={s.guideTitle}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="tertiary" data-size="sm">
                      {article.title}
                    </Button>
                  </Link>
                ))}
              </Stack>
            )}
          </Card>
        ))}
      </Stack>
    </div>
  );
}
