/**
 * Magic Link Callback Page — Web App
 *
 * Verifies the magic link token from URL params,
 * creates a session, and redirects into the app.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stack, Spinner, Button, Heading, Paragraph, Card } from '@digipicks/ds';
import { useMagicLink } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';

const pageStyle = {
  minHeight: '100vh',
  backgroundColor: 'var(--ds-color-neutral-background-default)',
} as const;

const cardStyle = {
  textAlign: 'center' as const,
  maxWidth: 400,
  padding: 'var(--ds-size-8)',
};

export function MagicLinkCallbackPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  const { verifyMagicLink, isVerifying } = useMagicLink({
    appId: 'web',
    onSuccess: () => {
      // Will redirect after verification
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError(t('web.magicLink.invalidToken'));
      return;
    }

    verifyMagicLink(token).then((result) => {
      if (result.success) {
        // Full page reload so auth state re-initializes
        window.location.href = result.returnPath || '/';
      }
    });
  }, [searchParams, verifyMagicLink]);

  if (error) {
    return (
      <Stack direction="horizontal" align="center" justify="center" style={pageStyle}>
        <Card style={cardStyle}>
          <Stack direction="vertical" align="center" spacing="var(--ds-size-4)">
            <Heading level={2} data-size="sm" style={{ margin: 0, color: 'var(--ds-color-danger-text-default)' }}>
              {t('web.magicLink.invalidLink')}
            </Heading>
            <Stack direction="vertical" spacing="var(--ds-size-6)" align="center">
              <Paragraph data-size="sm" style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
                {error}
              </Paragraph>
              <Button variant="primary" asChild>
                <a href="/login">{t('web.magicLink.backToLogin')}</a>
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    );
  }

  if (isVerifying) {
    return (
      <Stack direction="horizontal" align="center" justify="center" style={pageStyle}>
        <Card style={cardStyle}>
          <Stack direction="vertical" align="center" spacing="var(--ds-size-4)">
            <Spinner aria-label={t('web.magicLink.verifying')} />
            <Paragraph data-size="sm" style={{ margin: 0, color: 'var(--ds-color-neutral-text-subtle)' }}>
              {t('web.magicLink.verifyingLink')}
            </Paragraph>
          </Stack>
        </Card>
      </Stack>
    );
  }

  return null;
}
