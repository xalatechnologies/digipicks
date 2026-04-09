/**
 * TenantBrandingPage
 *
 * TenantAdmin page for customizing tenant branding
 * - Logo upload
 * - Color scheme
 * - Typography
 * - Email templates
 */

import { useState } from 'react';
import { useT } from '@digipicks/i18n';
import {
  Card,
  Heading,
  Paragraph,
  Button,
  Input,
  Textfield,
  DashboardPageHeader,
  PageContentLayout,
  Stack,
  Grid,
  FormField,
  useIsMobile,
} from '@digipicks/ds';
import styles from './branding.module.css';

const COLOR_PRESETS = [
  { nameKey: 'tenantBranding.colorBlue', primary: '#2563eb', accent: '#3b82f6' },
  { nameKey: 'tenantBranding.colorGreen', primary: '#16a34a', accent: '#22c55e' },
  { nameKey: 'tenantBranding.colorPurple', primary: '#7c3aed', accent: '#8b5cf6' },
  { nameKey: 'tenantBranding.colorOrange', primary: '#ea580c', accent: '#f97316' },
];

export function TenantBrandingPage() {
  const t = useT();
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  // Branding state
  const [branding, setBranding] = useState({
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
    logoUrl: '',
    faviconUrl: '',
    headerText: 'Booking av lokaler',
    footerText: '© 2026',
  });

  const updateBranding = (key: string, value: string) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setBranding((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      accentColor: preset.accent,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('tenantBranding.title')}
        subtitle={t('tenantBranding.subtitle')}
        actions={
          <Button
            type="button"
            variant="primary"
            data-size="md"
            onClick={handleSave}
            disabled={isSaving}
            className={styles.saveButton}
          >
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        }
      />

      {/* Color Scheme */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('tenantBranding.colorScheme')}
        </Heading>

        {/* Presets */}
        <Paragraph data-size="sm" className={styles.labelMarginBottom}>
          {t('tenantBranding.presets')}
        </Paragraph>
        <Stack direction="horizontal" spacing="var(--ds-size-2)" wrap className={styles.presetsMarginBottom}>
          {COLOR_PRESETS.map((preset) => (
            <Button
              key={preset.nameKey}
              type="button"
              variant="secondary"
              data-size="sm"
              onClick={() => applyPreset(preset)}
              style={{
                border:
                  branding.primaryColor === preset.primary
                    ? '2px solid var(--ds-color-accent-border-default)'
                    : undefined,
              }}
            >
              <Stack direction="horizontal" align="center" spacing="var(--ds-size-2)">
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--ds-border-radius-full)',
                    backgroundColor: preset.primary,
                  }}
                />
                {t(preset.nameKey)}
              </Stack>
            </Button>
          ))}
        </Stack>

        {/* Custom colors */}
        <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
          <FormField label={t('tenantBranding.primaryColor')}>
            <Stack direction="horizontal" spacing="var(--ds-size-2)">
              <Textfield
                type="color"
                value={branding.primaryColor}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
                aria-label={t('tenantBranding.primaryColor')}
                className={styles.colorPickerButton}
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
                className={styles.flexOne}
              />
            </Stack>
          </FormField>
          <FormField label={t('tenantBranding.accentColor')}>
            <Stack direction="horizontal" spacing="var(--ds-size-2)">
              <Textfield
                type="color"
                value={branding.accentColor}
                onChange={(e) => updateBranding('accentColor', e.target.value)}
                aria-label={t('tenantBranding.accentColor')}
                className={styles.colorPickerButton}
              />
              <Input
                value={branding.accentColor}
                onChange={(e) => updateBranding('accentColor', e.target.value)}
                className={styles.flexOne}
              />
            </Stack>
          </FormField>
        </Grid>
      </Card>

      {/* Logo */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('tenantBranding.logo')}
        </Heading>
        <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
          <Stack direction="vertical" spacing="var(--ds-size-2)">
            <Paragraph data-size="sm" className={styles.labelMedium}>
              {t('tenantBranding.mainLogo')}
            </Paragraph>
            <Stack direction="vertical" align="center" spacing="var(--ds-size-1)" className={styles.dropzone}>
              <Paragraph data-size="sm" className={styles.subtleText}>
                {t('tenantBranding.uploadHint')}
              </Paragraph>
              <Paragraph data-size="xs" className={styles.subtleText}>
                {t('tenantBranding.uploadFormats')}
              </Paragraph>
            </Stack>
          </Stack>
          <Stack direction="vertical" spacing="var(--ds-size-2)">
            <Paragraph data-size="sm" className={styles.labelMedium}>
              {t('tenantBranding.favicon')}
            </Paragraph>
            <Stack direction="vertical" align="center" spacing="var(--ds-size-1)" className={styles.dropzone}>
              <Paragraph data-size="sm" className={styles.subtleText}>
                {t('tenantBranding.uploadHint')}
              </Paragraph>
              <Paragraph data-size="xs" className={styles.subtleText}>
                {t('tenantBranding.faviconFormats')}
              </Paragraph>
            </Stack>
          </Stack>
        </Grid>
      </Card>

      {/* Text Content */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('tenantBranding.textContent')}
        </Heading>
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <FormField label={t('tenantBranding.headerText')}>
            <Input
              value={branding.headerText}
              onChange={(e) => updateBranding('headerText', e.target.value)}
              className={styles.fullWidthInput}
            />
          </FormField>
          <FormField label={t('tenantBranding.footerText')}>
            <Input
              value={branding.footerText}
              onChange={(e) => updateBranding('footerText', e.target.value)}
              className={styles.fullWidthInput}
            />
          </FormField>
        </Stack>
      </Card>

      {/* Preview */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('tenantBranding.preview')}
        </Heading>
        <div className={styles.previewContainer}>
          {/* Mock header */}
          <Stack
            direction="horizontal"
            justify="between"
            align="center"
            style={{
              padding: 'var(--ds-size-3) var(--ds-size-4)',
              backgroundColor: branding.primaryColor,
              color: 'white',
            }}
          >
            <span style={{ fontWeight: 600 }}>{branding.headerText}</span>
            <Stack direction="horizontal" spacing="var(--ds-size-2)">
              <div className={styles.previewNavItem} />
              <div className={styles.previewNavItem} />
            </Stack>
          </Stack>
          {/* Mock content */}
          <div className={styles.previewContent}>
            <Stack direction="horizontal" spacing="var(--ds-size-3)">
              <div className={styles.previewPlaceholder} />
              <div className={styles.previewPlaceholder} />
            </Stack>
            <div
              style={{
                marginTop: 'var(--ds-size-3)',
                padding: 'var(--ds-size-2) var(--ds-size-4)',
                backgroundColor: branding.accentColor,
                color: 'white',
                borderRadius: 'var(--ds-border-radius-md)',
                display: 'inline-block',
              }}
            >
              {t('tenantBranding.exampleButton')}
            </div>
          </div>
          {/* Mock footer */}
          <div className={styles.previewFooter}>{branding.footerText}</div>
        </div>
      </Card>
    </PageContentLayout>
  );
}
