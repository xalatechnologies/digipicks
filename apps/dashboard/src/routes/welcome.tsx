/**
 * WelcomePage — Post-approval welcome for new owners.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Stack,
  Tag,
  CheckIcon,
  PlusIcon,
  PageContentLayout,
} from '@digilist-saas/ds';
import { useAuth, useTenantContext, useSetPageTitle } from '@digilist-saas/app-shell';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

const PLAN_LABELS: Record<string, { label: string; color: 'neutral' | 'accent' | 'success' }> = {
  basis: { label: 'Basis · 5%', color: 'neutral' },
  pluss: { label: 'Pluss · 10%', color: 'accent' },
  premium: { label: 'Premium · 15%', color: 'success' },
};

export function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId } = useTenantContext();
  useSetPageTitle('Velkommen');

  const updateOnboardingStep = useMutation(api.domain.tenantOnboarding.updateOnboardingStep);

  const userName = user?.name || user?.email || 'partner';
  const plan = ((user as any)?.plan || 'basis').toLowerCase();
  const planInfo = PLAN_LABELS[plan] ?? PLAN_LABELS.basis;

  const handleGoToDashboard = useCallback(async () => {
    if (tenantId) {
      try {
        await updateOnboardingStep({ tenantId: tenantId as Id<"tenants">, step: 'complete' });
      } catch { /* non-critical */ }
    }
    navigate('/');
  }, [tenantId, updateOnboardingStep, navigate]);

  const steps = [
    { key: 'profile', title: 'Profil opprettet', desc: 'Kontoen din er klar til bruk.', done: true },
    { key: 'listing', title: 'Opprett ditt første lokale', desc: 'Legg til bilder, beskrivelse og priser.', link: '/listings/new', action: 'Opprett lokale' },
    { key: 'pricing', title: 'Sett opp priser', desc: 'Konfigurer prisgrupper, rabattkoder og tillegg.', link: '/pricing-rules', action: 'Gå til priser' },
    { key: 'contact', title: 'Legg til kontaktinfo', desc: 'Telefon, e-post og åpningstider.', link: '/settings', action: 'Gå til innstillinger' },
  ];

  return (
    <PageContentLayout>
      <Stack direction="vertical" spacing="var(--ds-size-8)" style={{ paddingTop: 'var(--ds-size-6)', paddingBottom: 'var(--ds-size-10)' }}>

        {/* Hero */}
        <Stack direction="vertical" spacing="var(--ds-size-3)" align="center" style={{ textAlign: 'center', padding: 'var(--ds-size-8) 0' }}>
          <Heading level={1} data-size="xl">Velkommen, {userName}!</Heading>
          <Paragraph data-size="lg" data-color="subtle">Du er nå klar til å komme i gang som utleier på plattformen.</Paragraph>
          <Tag data-size="md" data-color={planInfo.color}>{planInfo.label}</Tag>
        </Stack>

        {/* Checklist */}
        <Stack direction="vertical" spacing="var(--ds-size-3)">
          <Heading level={2} data-size="sm">Kom i gang</Heading>

          {steps.map((step) => (
            <Card key={step.key}>
              <Stack direction="horizontal" spacing="var(--ds-size-4)" align="center">
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: step.done ? 'var(--ds-color-success-surface-default)' : 'var(--ds-color-neutral-surface-default)',
                  color: step.done ? 'var(--ds-color-success-base-default)' : 'var(--ds-color-neutral-text-subtle)',
                }}>
                  {step.done ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
                </div>
                <Stack direction="vertical" spacing="var(--ds-size-1)" style={{ flex: 1 }}>
                  <Paragraph data-size="md" style={{ fontWeight: 'var(--ds-font-weight-semibold, 600)', margin: 0 }}>{step.title}</Paragraph>
                  <Paragraph data-size="sm" data-color="subtle" style={{ margin: 0 }}>{step.desc}</Paragraph>
                </Stack>
                {step.link && (
                  <Button type="button" variant="secondary" data-size="sm" onClick={() => navigate(step.link!)}>
                    {step.action}
                  </Button>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>

        {/* CTA */}
        <Stack direction="horizontal" justify="center">
          <Button type="button" variant="primary" data-size="lg" onClick={handleGoToDashboard}>
            Gå til kontrollpanelet
          </Button>
        </Stack>

      </Stack>
    </PageContentLayout>
  );
}
