import React from 'react';
import { Heading, Paragraph, Button, Stack } from '@digilist-saas/ds';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@digilist-saas/app-shell';
import { useT } from '@digilist-saas/i18n';

export function ListingsPage(): React.ReactElement {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const t = useT();

    return (
        <Stack align="center" spacing={8} style={{ padding: '80px 24px', maxWidth: 800, margin: '0 auto' }}>
            <Heading level={1} data-size="2xl" style={{ textAlign: 'center' }}>
                {t('landing.hero.title', 'Build Production-Ready SaaS in Days — Not Months')}
            </Heading>
            <Paragraph data-size="lg" style={{ textAlign: 'center', maxWidth: 600 }}>
                {t('landing.hero.subtitle', 'A modern SaaS starter kit powered by React, Vite, and Convex — with authentication, multi-tenancy, billing, automation, and AI built-in from day one.')}
            </Paragraph>
            <Stack direction="horizontal" spacing={4} justify="center">
                {!isAuthenticated ? (
                    <>
                        <Button onClick={() => navigate('/register')} data-size="lg" color="accent">
                            {t('landing.hero.cta', 'Get Started')}
                        </Button>
                        <Button onClick={() => navigate('/pricing')} data-size="lg" variant="secondary">
                            {t('landing.hero.ctaSecondary', 'View Pricing')}
                        </Button>
                    </>
                ) : (
                    <Button onClick={() => window.location.href = String(import.meta.env.VITE_DASHBOARD_URL || '/min-side')} data-size="lg" color="accent">
                        {t('landing.hero.ctaDashboard', 'Go to Dashboard')}
                    </Button>
                )}
            </Stack>
        </Stack>
    );
}
