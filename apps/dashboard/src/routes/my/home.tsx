/**
 * PersonalHomePage — User's personal dashboard
 *
 * Adapts based on user type:
 * - Normal user (no tenant): My bookings summary + "Bli utleier" CTA
 * - Owner (has tenant) in leietaker mode: My bookings summary + quick switch to utleier
 */

import {
  Card,
  Heading,
  Paragraph,
  Button,
  Stack,
  Grid,
  ArrowRightIcon,
  BuildingIcon,
  DashboardPageHeader,
  PageContentLayout,
  useIsMobile,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useSetPageTitle, useIsOwner, useIsNormalUser, env } from '@digilist-saas/app-shell';
import { useModeOptional } from '@digilist-saas/app-shell';
import { useNavigate } from 'react-router-dom';

export function PersonalHomePage() {
  const t = useT();
  const navigate = useNavigate();
  const isOwner = useIsOwner();
  const isNormalUser = useIsNormalUser();
  const modeCtx = useModeOptional();
  const isMobile = useIsMobile();

  useSetPageTitle(t('minside.dashboard', 'Min side'));

  return (
    <PageContentLayout data-gap="sm">
      <DashboardPageHeader
        actions={
          isOwner && modeCtx?.canToggle ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                modeCtx.setMode('utleier');
                navigate('/');
              }}
            >
              <BuildingIcon size={16} />
              {t('mode.switchToUtleier', 'Bytt til utleier')}
            </Button>
          ) : undefined
        }
      />

      <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
        <Card data-color="neutral">
          <Stack direction="vertical" spacing="var(--ds-size-4)">
            <Heading level={3} data-size="sm">{t('minside.welcome', 'Velkommen')}</Heading>
            <Paragraph>
              Dette er din personlige startside. Her kan du administrere din profil og dine innstillinger.
            </Paragraph>
          </Stack>
        </Card>

        {isOwner && (
          <Card data-color="neutral">
            <Stack direction="vertical" spacing="var(--ds-size-4)">
              <Heading level={3} data-size="sm">{t('mode.utleierDashboard', 'Utleier-dashboard')}</Heading>
              <Paragraph data-size="sm" data-color="subtle">
                {t('mode.switchDesc', 'Administrer organisasjon, brukere og abonnement')}
              </Paragraph>
              <Button type="button" variant="primary" data-size="lg" onClick={() => {
                modeCtx?.setMode('utleier');
                navigate('/');
              }}>
                <BuildingIcon size={16} />
                {t('mode.switchToUtleier', 'Bytt til utleier')}
                <ArrowRightIcon size={16} />
              </Button>
            </Stack>
          </Card>
        )}
      </Grid>
    </PageContentLayout>
  );
}
