/**
 * CreatorBrandingPage
 *
 * Dashboard page for creators to customize their subscriber-facing branding:
 * - Color scheme (primary, secondary, accent)
 * - Logo & banner upload
 * - Display name & tagline overrides
 * - Custom domain configuration
 * - Live preview of branded creator profile
 */

import { useState, useCallback, useRef } from 'react';
import { useT } from '@digilist-saas/i18n';
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
  StatusTag,
  useIsMobile,
} from '@digilist-saas/ds';
import { useAuth, env } from '@digilist-saas/app-shell';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@digilist-saas/sdk/convex-api';
import { useFileUpload } from '@digilist-saas/sdk/hooks/use-file-upload';
import styles from './creator-branding.module.css';

const COLOR_PRESETS = [
  { name: 'Midnight', primary: '#1e293b', accent: '#3b82f6' },
  { name: 'Electric', primary: '#7c3aed', accent: '#a78bfa' },
  { name: 'Forest', primary: '#166534', accent: '#22c55e' },
  { name: 'Ember', primary: '#9a3412', accent: '#f97316' },
  { name: 'Ocean', primary: '#0c4a6e', accent: '#06b6d4' },
  { name: 'Rose', primary: '#9f1239', accent: '#fb7185' },
];

export function CreatorBrandingPage() {
  const t = useT();
  const isMobile = useIsMobile();
  const auth = useAuth();
  const tenantId = env.tenantId;
  const creatorId = auth.isAuthenticated ? (auth as any).user?.id : undefined;

  // Fetch existing creator branding
  const existingBranding = useQuery(
    api.domain.tenantConfig.getCreatorBranding,
    tenantId && creatorId ? { tenantId, creatorId } : 'skip'
  );

  const existingAssets = useQuery(
    api.domain.tenantConfig.listCreatorBrandAssets,
    tenantId && creatorId ? { tenantId, creatorId } : 'skip'
  );

  const updateBrandingMutation = useMutation(api.domain.tenantConfig.updateCreatorBranding);
  const uploadAssetMutation = useMutation(api.domain.tenantConfig.uploadCreatorBrandAsset);
  const { uploadBase64Image } = useFileUpload();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Local state (initialized from server data or defaults)
  const [branding, setBranding] = useState(() => ({
    primaryColor: existingBranding?.primaryColor || '#1e293b',
    secondaryColor: existingBranding?.secondaryColor || '#f8fafc',
    accentColor: existingBranding?.accentColor || '#3b82f6',
    fontFamily: existingBranding?.fontFamily || '',
    borderRadius: existingBranding?.borderRadius || '',
    displayName: existingBranding?.displayName || '',
    tagline: existingBranding?.tagline || '',
    customDomain: existingBranding?.customDomain || '',
    customCSS: existingBranding?.customCSS || '',
  }));

  // Sync from server when data loads
  const serverKey = existingBranding?._id;
  const [lastServerKey, setLastServerKey] = useState<string | undefined>();
  if (serverKey && serverKey !== lastServerKey) {
    setLastServerKey(serverKey);
    setBranding({
      primaryColor: existingBranding?.primaryColor || '#1e293b',
      secondaryColor: existingBranding?.secondaryColor || '#f8fafc',
      accentColor: existingBranding?.accentColor || '#3b82f6',
      fontFamily: existingBranding?.fontFamily || '',
      borderRadius: existingBranding?.borderRadius || '',
      displayName: existingBranding?.displayName || '',
      tagline: existingBranding?.tagline || '',
      customDomain: existingBranding?.customDomain || '',
      customCSS: existingBranding?.customCSS || '',
    });
  }

  const updateField = useCallback((key: string, value: string) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((preset: (typeof COLOR_PRESETS)[0]) => {
    setBranding((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      accentColor: preset.accent,
    }));
  }, []);

  const handleSave = async () => {
    if (!tenantId || !creatorId) return;
    setIsSaving(true);
    try {
      await updateBrandingMutation({
        tenantId,
        creatorId,
        primaryColor: branding.primaryColor || undefined,
        secondaryColor: branding.secondaryColor || undefined,
        accentColor: branding.accentColor || undefined,
        fontFamily: branding.fontFamily || undefined,
        borderRadius: branding.borderRadius || undefined,
        displayName: branding.displayName || undefined,
        tagline: branding.tagline || undefined,
        customDomain: branding.customDomain || undefined,
        customCSS: branding.customCSS || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = useCallback(
    async (file: File, assetType: 'logo' | 'banner') => {
      if (!tenantId || !creatorId) return;
      setIsUploading(assetType);
      try {
        const reader = new FileReader();
        const dataUri = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        const url = await uploadBase64Image(dataUri);

        await uploadAssetMutation({
          tenantId,
          creatorId,
          assetType,
          url,
          alt: assetType === 'logo' ? 'Creator logo' : 'Creator banner',
        });
      } finally {
        setIsUploading(null);
      }
    },
    [tenantId, creatorId, uploadBase64Image, uploadAssetMutation]
  );

  const handleDropzoneClick = useCallback(
    (assetType: 'logo' | 'banner') => {
      const ref = assetType === 'logo' ? logoInputRef : bannerInputRef;
      ref.current?.click();
    },
    []
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, assetType: 'logo' | 'banner') => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file, assetType);
      }
      e.target.value = '';
    },
    [handleFileUpload]
  );

  // Resolve asset URLs from fetched data
  const logoAsset = existingAssets?.find(
    (a: any) => a.assetType === 'logo'
  );
  const bannerAsset = existingAssets?.find(
    (a: any) => a.assetType === 'banner'
  );

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={t('creatorBranding.title', 'Your Brand')}
        subtitle={t(
          'creatorBranding.subtitle',
          'Customize how your profile looks to subscribers'
        )}
        actions={
          <Button
            type="button"
            variant="primary"
            data-size="md"
            onClick={handleSave}
            disabled={isSaving}
            className={styles.saveButton}
          >
            {isSaving
              ? t('common.saving', 'Saving...')
              : t('common.save', 'Save')}
          </Button>
        }
      />

      {/* Color Scheme */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('creatorBranding.colorScheme', 'Color Scheme')}
        </Heading>

        <Paragraph data-size="sm" className={styles.labelMarginBottom}>
          {t('creatorBranding.presets', 'Presets')}
        </Paragraph>
        <Stack
          direction="horizontal"
          spacing="var(--ds-size-2)"
          wrap
          className={styles.presetsMarginBottom}
        >
          {COLOR_PRESETS.map((preset) => (
            <Button
              key={preset.name}
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
              <Stack
                direction="horizontal"
                align="center"
                spacing="var(--ds-size-2)"
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--ds-border-radius-full)',
                    background: `linear-gradient(135deg, ${preset.primary} 50%, ${preset.accent} 50%)`,
                  }}
                />
                {preset.name}
              </Stack>
            </Button>
          ))}
        </Stack>

        <Grid columns={isMobile ? '1fr' : '1fr 1fr 1fr'} gap="var(--ds-size-4)">
          <FormField label={t('creatorBranding.primaryColor', 'Primary Color')}>
            <Stack direction="horizontal" spacing="var(--ds-size-2)">
              <Textfield
                type="color"
                value={branding.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
                aria-label={t('creatorBranding.primaryColor', 'Primary Color')}
                className={styles.colorPickerButton}
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
                className={styles.flexOne}
              />
            </Stack>
          </FormField>
          <FormField label={t('creatorBranding.secondaryColor', 'Secondary Color')}>
            <Stack direction="horizontal" spacing="var(--ds-size-2)">
              <Textfield
                type="color"
                value={branding.secondaryColor}
                onChange={(e) => updateField('secondaryColor', e.target.value)}
                aria-label={t('creatorBranding.secondaryColor', 'Secondary Color')}
                className={styles.colorPickerButton}
              />
              <Input
                value={branding.secondaryColor}
                onChange={(e) => updateField('secondaryColor', e.target.value)}
                className={styles.flexOne}
              />
            </Stack>
          </FormField>
          <FormField label={t('creatorBranding.accentColor', 'Accent Color')}>
            <Stack direction="horizontal" spacing="var(--ds-size-2)">
              <Textfield
                type="color"
                value={branding.accentColor}
                onChange={(e) => updateField('accentColor', e.target.value)}
                aria-label={t('creatorBranding.accentColor', 'Accent Color')}
                className={styles.colorPickerButton}
              />
              <Input
                value={branding.accentColor}
                onChange={(e) => updateField('accentColor', e.target.value)}
                className={styles.flexOne}
              />
            </Stack>
          </FormField>
        </Grid>
      </Card>

      {/* Brand Assets */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('creatorBranding.brandAssets', 'Brand Assets')}
        </Heading>
        <Grid columns={isMobile ? '1fr' : '1fr 1fr'} gap="var(--ds-size-4)">
          <Stack direction="vertical" spacing="var(--ds-size-2)">
            <Paragraph data-size="sm" className={styles.labelMedium}>
              {t('creatorBranding.logo', 'Logo')}
            </Paragraph>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={(e) => handleFileChange(e, 'logo')}
            />
            <div
              className={logoAsset?.url ? styles.dropzoneWithImage : styles.dropzone}
              onClick={() => handleDropzoneClick('logo')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDropzoneClick('logo'); }}
            >
              {isUploading === 'logo' ? (
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('common.uploading', 'Uploading...')}
                </Paragraph>
              ) : logoAsset?.url ? (
                <img
                  src={logoAsset.url}
                  alt={logoAsset.alt || 'Logo'}
                  className={styles.assetPreview}
                />
              ) : (
                <Stack direction="vertical" align="center" spacing="var(--ds-size-1)">
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('creatorBranding.uploadHint', 'Click or drag to upload')}
                  </Paragraph>
                  <Paragraph data-size="xs" className={styles.subtleText}>
                    PNG, SVG, or JPG (max 2MB)
                  </Paragraph>
                </Stack>
              )}
            </div>
          </Stack>
          <Stack direction="vertical" spacing="var(--ds-size-2)">
            <Paragraph data-size="sm" className={styles.labelMedium}>
              {t('creatorBranding.banner', 'Banner Image')}
            </Paragraph>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={(e) => handleFileChange(e, 'banner')}
            />
            <div
              className={bannerAsset?.url ? styles.dropzoneWithImage : styles.dropzone}
              onClick={() => handleDropzoneClick('banner')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDropzoneClick('banner'); }}
            >
              {isUploading === 'banner' ? (
                <Paragraph data-size="sm" className={styles.subtleText}>
                  {t('common.uploading', 'Uploading...')}
                </Paragraph>
              ) : bannerAsset?.url ? (
                <img
                  src={bannerAsset.url}
                  alt={bannerAsset.alt || 'Banner'}
                  className={styles.assetPreview}
                />
              ) : (
                <Stack direction="vertical" align="center" spacing="var(--ds-size-1)">
                  <Paragraph data-size="sm" className={styles.subtleText}>
                    {t('creatorBranding.uploadHint', 'Click or drag to upload')}
                  </Paragraph>
                  <Paragraph data-size="xs" className={styles.subtleText}>
                    1200x400 recommended
                  </Paragraph>
                </Stack>
              )}
            </div>
          </Stack>
        </Grid>
      </Card>

      {/* Display Name & Tagline */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('creatorBranding.identity', 'Brand Identity')}
        </Heading>
        <Stack direction="vertical" spacing="var(--ds-size-4)">
          <FormField
            label={t('creatorBranding.displayName', 'Brand Name')}
          >
            <Input
              value={branding.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
              placeholder={t(
                'creatorBranding.displayNamePlaceholder',
                'Override your display name for subscribers'
              )}
              className={styles.fullWidthInput}
            />
          </FormField>
          <FormField
            label={t('creatorBranding.tagline', 'Tagline')}
          >
            <Input
              value={branding.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              placeholder={t(
                'creatorBranding.taglinePlaceholder',
                'e.g. "Sharp picks. Sharp profits."'
              )}
              className={styles.fullWidthInput}
            />
          </FormField>
        </Stack>
      </Card>

      {/* Custom Domain */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('creatorBranding.customDomain', 'Custom Domain')}
        </Heading>
        <Paragraph data-size="sm" className={styles.subtleText} style={{ marginBottom: 'var(--ds-size-3)' }}>
          {t(
            'creatorBranding.customDomainHint',
            'Point your own domain to your creator page. Add a CNAME record pointing to creators.digipicks.com.'
          )}
        </Paragraph>
        <FormField
          label={t('creatorBranding.domain', 'Domain')}
        >
          <Input
            value={branding.customDomain}
            onChange={(e) => updateField('customDomain', e.target.value)}
            placeholder="picks.yourdomain.com"
            className={styles.fullWidthInput}
          />
        </FormField>
        {branding.customDomain && (
          <div className={styles.domainStatus}>
            <div
              className={`${styles.domainDot} ${
                existingBranding?.customDomain === branding.customDomain
                  ? styles.domainActive
                  : styles.domainPending
              }`}
            />
            <Paragraph data-size="xs" className={styles.subtleText}>
              {existingBranding?.customDomain === branding.customDomain
                ? t('creatorBranding.domainConfigured', 'Domain configured — verify DNS')
                : t('creatorBranding.domainUnsaved', 'Save to apply domain')}
            </Paragraph>
          </div>
        )}
      </Card>

      {/* Live Preview */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('creatorBranding.preview', 'Live Preview')}
        </Heading>
        <div className={styles.previewContainer}>
          {/* Mock creator header */}
          <div
            className={styles.previewHeader}
            style={{ backgroundColor: branding.primaryColor }}
          >
            {logoAsset?.url ? (
              <img
                src={logoAsset.url}
                alt="Logo preview"
                className={styles.previewLogo}
              />
            ) : (
              <div className={styles.previewLogoPlaceholder} />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>
                {branding.displayName || t('creatorBranding.yourName', 'Your Name')}
              </div>
              {branding.tagline && (
                <div style={{ fontSize: '11px', opacity: 0.8 }}>
                  {branding.tagline}
                </div>
              )}
            </div>
          </div>

          {/* Mock stats */}
          <div className={styles.previewContent}>
            <div className={styles.previewStatGrid}>
              <div className={styles.previewStat}>
                <div className={styles.previewStatValue}>247</div>
                <div className={styles.previewStatLabel}>Picks</div>
              </div>
              <div className={styles.previewStat}>
                <div
                  className={styles.previewStatValue}
                  style={{ color: branding.accentColor }}
                >
                  62%
                </div>
                <div className={styles.previewStatLabel}>Win Rate</div>
              </div>
              <div className={styles.previewStat}>
                <div
                  className={styles.previewStatValue}
                  style={{ color: branding.accentColor }}
                >
                  +18.4%
                </div>
                <div className={styles.previewStatLabel}>ROI</div>
              </div>
            </div>

            <div
              className={styles.previewCta}
              style={{ backgroundColor: branding.accentColor }}
            >
              {t('creatorBranding.previewSubscribe', 'Subscribe')}
            </div>
          </div>

          <div className={styles.previewFooter}>
            {branding.customDomain || 'digipicks.com/creator/you'}
          </div>
        </div>
      </Card>

      {/* Advanced: Custom CSS */}
      <Card data-color="neutral" className={styles.cardPaddingLg}>
        <Heading level={2} data-size="sm" className={styles.sectionHeading}>
          {t('creatorBranding.advanced', 'Advanced')}
        </Heading>
        <FormField
          label={t('creatorBranding.customCSS', 'Custom CSS')}
        >
          <Textfield
            value={branding.customCSS}
            onChange={(e) => updateField('customCSS', e.target.value)}
            aria-label={t('creatorBranding.customCSS', 'Custom CSS')}
            placeholder=".creator-profile { /* your overrides */ }"
          />
        </FormField>
        <Paragraph data-size="xs" className={styles.subtleText} style={{ marginTop: 'var(--ds-size-2)' }}>
          {t(
            'creatorBranding.customCSSHint',
            'Advanced: Add custom CSS rules to fine-tune your branded page. Use --creator-brand-* variables.'
          )}
        </Paragraph>
      </Card>
    </PageContentLayout>
  );
}
