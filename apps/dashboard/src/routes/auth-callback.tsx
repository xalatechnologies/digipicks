/**
 * OAuth Callback Page — Backoffice App
 *
 * Receives sessionToken from URL params after OAuth redirect,
 * validates the session, stores it, and reloads into the app.
 */
import { useOAuthCallback } from '@digipicks/sdk';
import { useT } from '@digipicks/i18n';
import { Stack, Heading, Paragraph, Button } from '@digipicks/ds';
import s from './auth-callback.module.css';

export function AuthCallbackPage() {
  const t = useT();
  const { isProcessing, error } = useOAuthCallback({
    appId: 'backoffice',
    onSuccess: (returnPath) => {
      // Full page reload so auth re-initializes with the stored session
      window.location.href = returnPath || '/';
    },
    onError: (err) => {
      window.location.href = `/login?error=${encodeURIComponent(err)}`;
    },
  });

  if (error) {
    return (
      <Stack direction="vertical" spacing="var(--ds-size-4)" align="center" className={s.container}>
        <Heading level={2} data-size="md" className={s.centerText}>
          {t('authCallback.loginFailed')}
        </Heading>
        <Paragraph data-size="md" className={s.centerText}>
          {error}
        </Paragraph>
        <Button variant="secondary" asChild>
          <a href="/login">{t('authCallback.tryAgain')}</a>
        </Button>
      </Stack>
    );
  }

  if (isProcessing) {
    return (
      <Stack direction="vertical" align="center" spacing="var(--ds-size-4)" className={s.container}>
        <Paragraph data-size="md" className={s.centerText}>
          {t('authCallback.loggingIn')}
        </Paragraph>
      </Stack>
    );
  }

  return null;
}
