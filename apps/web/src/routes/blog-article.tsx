/**
 * BlogArticlePage — Web App
 *
 * Displays a single article's content.
 * URL: /blog/:guideSlug/:articleSlug
 */

import { useParams, useNavigate } from 'react-router-dom';
import { Card, Heading, Paragraph, Button } from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useDocsArticle } from '@digipicks/sdk';
import { env } from '@digipicks/app-shell';
import s from './blog.module.css';

export function BlogArticlePage() {
  const t = useT();
  const navigate = useNavigate();
  const { guideSlug, articleSlug } = useParams<{
    guideSlug: string;
    articleSlug: string;
  }>();
  const tenantId = env.tenantId || '';

  const article = useDocsArticle(
    tenantId && guideSlug && articleSlug ? { tenantId, guideSlug, articleSlug } : 'skip',
  ) as
    | {
        _id: string;
        title: string;
        content?: string;
        description?: string;
      }
    | null
    | undefined;

  const isLoading = tenantId !== '' && guideSlug !== undefined && articleSlug !== undefined && article === undefined;

  if (isLoading) {
    return (
      <div className={s.pageContainer}>
        <Paragraph>{t('common.loading')}</Paragraph>
      </div>
    );
  }

  if (!article) {
    return (
      <div className={s.pageContainer}>
        <div className={s.emptyState}>
          <Paragraph className={s.emptyText}>{t('blog.noArticles')}</Paragraph>
          <Button variant="tertiary" onClick={() => navigate(`/blog/${guideSlug}`)}>
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
        onClick={() => navigate(`/blog/${guideSlug}`)}
        style={{ marginBottom: 'var(--ds-size-4)' }}
      >
        {t('blog.backToList')}
      </Button>

      {/* Article */}
      <Card className={s.guideCard}>
        <Heading level={1} data-size="lg" className={s.title}>
          {article.title}
        </Heading>
        {article.description && (
          <Paragraph data-size="md" className={s.subtitle}>
            {article.description}
          </Paragraph>
        )}
        {article.content && (
          <div className={s.guideDescription} dangerouslySetInnerHTML={{ __html: article.content }} />
        )}
      </Card>
    </div>
  );
}
