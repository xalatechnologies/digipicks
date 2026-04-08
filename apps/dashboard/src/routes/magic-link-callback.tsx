/**
 * Magic Link Callback Page — Minside
 *
 * Verifies the magic link token from URL params,
 * creates a session, and redirects into the app.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Stack, Spinner, Button, Heading, Paragraph, Card } from '@digilist-saas/ds';
import { useMagicLink } from '@digilist-saas/sdk';
import { useT } from '@digilist-saas/i18n';
import s from './MagicLinkCallback.module.css';

export function MagicLinkCallbackPage() {
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const t = useT();

    const { verifyMagicLink, isVerifying } = useMagicLink({
        appId: 'minside',
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
            setError(t('web.magicLink.invalidOrMissingLink'));
            return;
        }

        verifyMagicLink(token).then((result) => {
            if (result.success) {
                // Full page reload so auth state re-initializes
                window.location.href = result.returnPath || '/';
            }
        });
    }, [searchParams, verifyMagicLink, t]);

    if (error) {
        return (
            <Stack direction="horizontal" align="center" justify="center" className={s.page}>
                <Card className={s.card}>
                    <Stack direction="vertical" align="center" spacing="var(--ds-size-4)">
                        <Heading level={2} data-size="sm" className={s.dangerHeading}>
                            {t('web.magicLink.invalidLink')}
                        </Heading>
                        <Stack direction="vertical" spacing="var(--ds-size-6)" align="center">
                            <Paragraph data-size="sm" className={s.subtleText}>{error}</Paragraph>
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
            <Stack direction="horizontal" align="center" justify="center" className={s.page}>
                <Card className={s.card}>
                    <Stack direction="vertical" align="center" spacing="var(--ds-size-4)">
                        <Spinner aria-label={t('web.magicLink.verifying')} />
                        <Paragraph data-size="sm" className={s.subtleText}>{t('web.magicLink.verifyingLink')}</Paragraph>
                    </Stack>
                </Card>
            </Stack>
        );
    }

    return null;
}
