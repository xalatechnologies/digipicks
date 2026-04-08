/**
 * OAuth Callback Page — Web App
 *
 * Receives sessionToken from URL params after OAuth redirect,
 * validates the session, stores it, and reloads into the app.
 */
import { useOAuthCallback } from '@digilist-saas/sdk';
import { Stack, Heading, Paragraph, Button } from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';

export function AuthCallbackPage() {
  const t = useT();
  const { isProcessing, error } = useOAuthCallback({
    appId: 'web',
    onSuccess: (returnPath) => {
      // Full page reload so auth state re-initializes with the stored session
      window.location.href = returnPath || '/';
    },
    onError: (err) => {
      window.location.href = `/login?error=${encodeURIComponent(err)}`;
    },
  });

  if (error) {
    return (
      <Stack
        direction="vertical"
        spacing="var(--ds-size-4)"
        align="center"
        style={{ padding: 'var(--ds-size-8)' }}
      >
        <Heading level={2} data-size="md" style={{ margin: 0, textAlign: 'center' }}>
          {t('web.auth.loginFailed')}
        </Heading>
        <Paragraph data-size="md" style={{ margin: 0, textAlign: 'center' }}>
          {error}
        </Paragraph>
        <Button variant="secondary" asChild>
          <a href="/login">{t('common.retry')}</a>
        </Button>
      </Stack>
    );
  }

  if (isProcessing) {
    return (
      <Stack direction="vertical" align="center" spacing="var(--ds-size-4)" style={{ padding: 'var(--ds-size-8)' }}>
        <Paragraph data-size="md" style={{ margin: 0, textAlign: 'center' }}>
          {t('web.auth.loggingIn')}
        </Paragraph>
      </Stack>
    );
  }

  return null;
}
