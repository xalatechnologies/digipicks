import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  Card,
  Heading,
  Paragraph,
  Button,
  Stack,
  Textfield,
  Select,
  PillTabs,
  CheckCircleIcon,
  ExternalLinkIcon,
  SettingsIcon,
  CalendarIcon,
  CreditCardIcon,
  WalletIcon,
  MailIcon,
  UsersIcon,
  TicketIcon,
  LockIcon,
  ChartIcon,
  IconBox,
  MetadataRow,
  DashboardPageHeader,
  PageContentLayout,
  useToast,
} from '@digipicks/ds';
import { useT } from '@digipicks/i18n';
import { useIntegrationConfig, useCreateIntegrationConfig, useUpdateIntegrationConfig } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import styles from './integration-edit.module.css';

type WizardStep = 'general' | 'config' | 'review';

type ProviderType =
  | 'payment'
  | 'accounting'
  | 'calendar'
  | 'email'
  | 'crm'
  | 'webhook'
  | 'ticketing'
  | 'access'
  | 'erp';

// ─── Provider type → DS icon mapping ───

const TYPE_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  payment: CreditCardIcon,
  accounting: WalletIcon,
  calendar: CalendarIcon,
  email: MailIcon,
  crm: UsersIcon,
  webhook: ExternalLinkIcon,
  ticketing: TicketIcon,
  access: LockIcon,
  erp: ChartIcon,
};

// ─────────────────────────── Component ───────────────────────────

export function IntegrationEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthBridge();
  const t = useT();
  const { showToast } = useToast();

  // i18n-aware constants
  const WIZARD_STEPS = useMemo(
    () => [
      { id: 'general' as const, label: t('integrationEdit.stepGeneral') },
      { id: 'config' as const, label: t('integrationEdit.stepConfig') },
      { id: 'review' as const, label: t('integrationEdit.stepReview') },
    ],
    [t],
  );

  const PROVIDER_CATALOG = useMemo(
    () => [
      { id: 'vipps', name: 'Vipps MobilePay', type: 'payment', description: t('integrationEdit.providerVippsDesc') },
      { id: 'stripe', name: 'Stripe', type: 'payment', description: t('integrationEdit.providerStripeDesc') },
      { id: 'nets', name: 'Nets (Nexi)', type: 'payment', description: t('integrationEdit.providerNetsDesc') },
      { id: 'buypass', name: 'Buypass', type: 'payment', description: t('integrationEdit.providerBuypassDesc') },
      { id: 'visma', name: 'Visma Business', type: 'accounting', description: t('integrationEdit.providerVismaDesc') },
      {
        id: 'tripletex',
        name: 'Tripletex',
        type: 'accounting',
        description: t('integrationEdit.providerTripletexDesc'),
      },
      {
        id: 'poweroffice',
        name: 'PowerOffice Go',
        type: 'accounting',
        description: t('integrationEdit.providerPowerofficeDesc'),
      },
      { id: 'fiken', name: 'Fiken', type: 'accounting', description: t('integrationEdit.providerFikenDesc') },
      { id: 'altinn', name: 'Altinn', type: 'accounting', description: t('integrationEdit.providerAltinnDesc') },
      { id: 'ubw', name: 'UBW (Unit4)', type: 'erp', description: t('integrationEdit.providerUbwDesc') },
      {
        id: 'ticketmaster',
        name: 'TicketMaster',
        type: 'ticketing',
        description: t('integrationEdit.providerTicketmasterDesc'),
      },
      { id: 'ebillet', name: 'eBillett', type: 'ticketing', description: t('integrationEdit.providerEbillettDesc') },
      { id: 'rco', name: 'RCO', type: 'access', description: t('integrationEdit.providerRcoDesc') },
      {
        id: 'google-calendar',
        name: 'Google Calendar',
        type: 'calendar',
        description: t('integrationEdit.providerGoogleCalDesc'),
      },
      {
        id: 'outlook',
        name: 'Microsoft Outlook',
        type: 'calendar',
        description: t('integrationEdit.providerOutlookDesc'),
      },
      { id: 'resend', name: 'Resend', type: 'email', description: t('integrationEdit.providerResendDesc') },
      { id: 'sendgrid', name: 'SendGrid', type: 'email', description: t('integrationEdit.providerSendgridDesc') },
      { id: 'mailchimp', name: 'Mailchimp', type: 'email', description: t('integrationEdit.providerMailchimpDesc') },
      { id: 'hubspot', name: 'HubSpot', type: 'crm', description: t('integrationEdit.providerHubspotDesc') },
      { id: 'salesforce', name: 'Salesforce', type: 'crm', description: t('integrationEdit.providerSalesforceDesc') },
      {
        id: 'custom-webhook',
        name: t('integrationEdit.providerCustomWebhook'),
        type: 'webhook',
        description: t('integrationEdit.providerCustomWebhookDesc'),
      },
      { id: 'zapier', name: 'Zapier', type: 'webhook', description: t('integrationEdit.providerZapierDesc') },
    ],
    [t],
  );

  const TYPE_META: Record<ProviderType, { label: string; iconVariant: 'success' | 'accent' | 'warning' | 'neutral' }> =
    useMemo(
      () => ({
        payment: { label: t('integrationEdit.typePayment'), iconVariant: 'success' },
        accounting: { label: t('integrationEdit.typeAccounting'), iconVariant: 'accent' },
        calendar: { label: t('integrationEdit.typeCalendar'), iconVariant: 'warning' },
        email: { label: t('integrationEdit.typeEmail'), iconVariant: 'accent' },
        crm: { label: t('backoffice2.crmLabel'), iconVariant: 'neutral' },
        webhook: { label: t('backoffice2.webhookLabel'), iconVariant: 'warning' },
        ticketing: { label: t('integrationEdit.typeTicketing'), iconVariant: 'success' },
        access: { label: t('integrationEdit.typeAccess'), iconVariant: 'neutral' },
        erp: { label: t('backoffice2.erpLabel'), iconVariant: 'accent' },
      }),
      [t],
    );

  const isEditMode = Boolean(slug);

  // ─── Form state ───
  const [currentStep, setCurrentStep] = useState<WizardStep>('general');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [integrationName, setIntegrationName] = useState('');
  const [environment, setEnvironment] = useState<string>('production');
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formInitialized, setFormInitialized] = useState(false);

  // ─── Mutation hooks ───
  const { createIntegrationConfig } = useCreateIntegrationConfig();
  const { updateIntegrationConfig } = useUpdateIntegrationConfig();

  // ─── Load existing config in edit mode ───
  const { config: existingConfig } = useIntegrationConfig(isEditMode ? slug : undefined);

  useEffect(() => {
    if (!existingConfig || formInitialized) return;
    // Find provider by ID first, then fall back to type match
    const matchedProvider =
      PROVIDER_CATALOG.find((p) => p.id === existingConfig.integrationType) ??
      PROVIDER_CATALOG.find((p) => p.type === existingConfig.integrationType);
    if (matchedProvider) setSelectedProvider(matchedProvider.id);
    if (existingConfig.name) setIntegrationName(existingConfig.name);
    if (existingConfig.environment) setEnvironment(existingConfig.environment);
    // Populate credentials
    if (existingConfig.apiKey) setApiKey(existingConfig.apiKey);
    if (existingConfig.secretKey) setSecretKey(existingConfig.secretKey);
    if (existingConfig.webhookSecret) setWebhookSecret(existingConfig.webhookSecret);
    // Populate nested config fields
    if (existingConfig.config?.calendarId) setCalendarId(existingConfig.config.calendarId as string);
    if (existingConfig.config?.companyId) setCompanyId(existingConfig.config.companyId as string);
    if (existingConfig.config?.webhookUrl) setWebhookUrl(existingConfig.config.webhookUrl as string);
    if (existingConfig.config?.fromEmail) setFromEmail(existingConfig.config.fromEmail as string);
    if (existingConfig.config?.fromName) setFromName(existingConfig.config.fromName as string);
    // In edit mode, skip past provider selection to config step
    if (isEditMode) setCurrentStep('config');
    setFormInitialized(true);
  }, [existingConfig, formInitialized, isEditMode, PROVIDER_CATALOG]);

  // ─── Derived data ───
  const provider = useMemo(() => PROVIDER_CATALOG.find((p) => p.id === selectedProvider), [selectedProvider]);

  const providerType = provider?.type as ProviderType | undefined;
  const typeMeta = providerType ? TYPE_META[providerType] : undefined;

  const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === currentStep);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'general':
        return Boolean(selectedProvider && integrationName.trim());
      case 'config':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedProvider, integrationName]);

  // ─── Handlers ───

  const handleNext = useCallback(() => {
    if (!isLastStep) setCurrentStep(WIZARD_STEPS[stepIndex + 1].id);
  }, [stepIndex, isLastStep]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) setCurrentStep(WIZARD_STEPS[stepIndex - 1].id);
  }, [stepIndex, isFirstStep]);

  const handleCancel = useCallback(() => {
    navigate('/integrations');
  }, [navigate]);

  const handleSave = useCallback(async () => {
    const tenantId = user?.tenantId;
    if (!tenantId || !provider) return;

    setIsSaving(true);
    try {
      const config: Record<string, string> = {};
      if (calendarId) config.calendarId = calendarId;
      if (companyId) config.companyId = companyId;
      if (webhookUrl) config.webhookUrl = webhookUrl;
      if (fromEmail) config.fromEmail = fromEmail;
      if (fromName) config.fromName = fromName;

      if (isEditMode && slug) {
        await updateIntegrationConfig({
          id: slug,
          name: integrationName,
          config,
          apiKey: apiKey || undefined,
          secretKey: secretKey || undefined,
          webhookSecret: webhookSecret || undefined,
          environment,
        });
      } else {
        await createIntegrationConfig({
          tenantId,
          integrationType: provider.type,
          name: integrationName,
          config,
          apiKey: apiKey || undefined,
          secretKey: secretKey || undefined,
          webhookSecret: webhookSecret || undefined,
          environment,
        });
      }
      navigate('/integrations');
    } catch (err) {
      showToast({ title: t('common.saveError'), variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [
    user,
    provider,
    isEditMode,
    slug,
    integrationName,
    environment,
    apiKey,
    secretKey,
    webhookUrl,
    webhookSecret,
    calendarId,
    companyId,
    fromEmail,
    fromName,
    createIntegrationConfig,
    updateIntegrationConfig,
    navigate,
    showToast,
    t,
  ]);

  const handleSaveDraft = useCallback(async () => {
    setSaveStatus('idle');
    setIsSaving(true);
    try {
      await handleSave();
      setSaveStatus('success');
      if (typeof window !== 'undefined') {
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [handleSave]);

  const handleProviderSelect = useCallback(
    (providerId: string) => {
      setSelectedProvider(providerId);
      const p = PROVIDER_CATALOG.find((pr) => pr.id === providerId);
      if (p && !integrationName) {
        setIntegrationName(p.name);
      }
    },
    [integrationName],
  );

  // ─── Step rendering ───

  const renderStepContent = () => {
    switch (currentStep) {
      // ═══════════════════ Step 1: General ═══════════════════
      case 'general':
        return (
          <Stack direction="vertical" spacing="var(--ds-size-6)">
            {/* ── Provider selection card grid ── */}
            <Card data-color="neutral">
              <div className={styles.cardInner}>
                <div className={styles.inlineHeader}>
                  <IconBox icon={<ExternalLinkIcon />} variant="accent" size="sm" />
                  <div className={styles.inlineHeaderText}>
                    <Heading data-size="2xs" className={styles.noMargin}>
                      {t('integrationEdit.selectProvider')}
                    </Heading>
                    <Paragraph data-size="xs" className={styles.subtleText}>
                      {t('integrationEdit.selectProviderDesc')}
                    </Paragraph>
                  </div>
                </div>

                <div className={styles.providerGrid}>
                  {PROVIDER_CATALOG.map((p) => {
                    const isSelected = selectedProvider === p.id;
                    const pType = p.type as ProviderType;
                    const IconComponent = TYPE_ICON_MAP[pType] || ExternalLinkIcon;
                    return (
                      <Button
                        key={p.id}
                        type="button"
                        variant={isSelected ? 'primary' : 'secondary'}
                        onClick={() => handleProviderSelect(p.id)}
                        className={styles.providerCard}
                        data-selected={isSelected}
                        aria-pressed={isSelected}
                      >
                        <div className={styles.providerIcon} data-selected={isSelected}>
                          <IconComponent size={28} />
                        </div>
                        <Paragraph
                          data-size="sm"
                          className={isSelected ? styles.providerNameSelected : styles.providerName}
                          data-selected={isSelected}
                        >
                          {p.name}
                        </Paragraph>
                        <Paragraph data-size="xs" className={styles.providerDescription}>
                          {p.description}
                        </Paragraph>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* ── Name + Environment ── */}
            <Card data-color="neutral">
              <div className={styles.cardInner}>
                <div className={styles.inlineHeader}>
                  <IconBox icon={<SettingsIcon />} variant="neutral" size="sm" />
                  <div className={styles.inlineHeaderText}>
                    <Heading data-size="2xs" className={styles.noMargin}>
                      {t('integrationEdit.basicSettings')}
                    </Heading>
                    <Paragraph data-size="xs" className={styles.subtleText}>
                      {t('integrationEdit.basicSettingsDesc')}
                    </Paragraph>
                  </div>
                </div>

                <Stack direction="vertical" spacing="var(--ds-size-4)">
                  <Textfield
                    label={t('integrationEdit.labelIntegrationName')}
                    value={integrationName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIntegrationName(e.target.value)}
                    placeholder={t('integrationEdit.namePlaceholder')}
                    description={t('integrationEdit.nameDescription')}
                  />
                  <Stack direction="vertical" spacing="var(--ds-size-1)">
                    <Paragraph data-size="sm" className={styles.labelText}>
                      {t('integrationEdit.labelEnvironment')}
                    </Paragraph>
                    <Select
                      value={environment}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEnvironment(e.target.value)}
                    >
                      <option value="production">{t('integrationEdit.envProduction')}</option>
                      <option value="sandbox">{t('integrationEdit.envSandbox')}</option>
                    </Select>
                  </Stack>
                </Stack>
              </div>
            </Card>
          </Stack>
        );

      // ═══════════════════ Step 2: Configuration ═══════════════════
      case 'config':
        return (
          <Stack direction="vertical" spacing="var(--ds-size-6)">
            {/* ── API credentials ── */}
            <Card data-color="neutral">
              <div className={styles.cardInner}>
                <div className={styles.inlineHeader}>
                  <IconBox icon={<SettingsIcon />} variant="accent" size="sm" />
                  <div className={styles.inlineHeaderText}>
                    <Heading data-size="2xs" className={styles.noMargin}>
                      {t('integrationEdit.apiKeys')}
                    </Heading>
                    <Paragraph data-size="xs" className={styles.subtleText}>
                      {t('integrationEdit.apiKeysDesc')}
                    </Paragraph>
                  </div>
                </div>

                <Stack direction="vertical" spacing="var(--ds-size-4)">
                  {providerType !== 'webhook' && (
                    <Textfield
                      label={t('integrationEdit.labelApiKey')}
                      value={apiKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                      placeholder="sk_live_..."
                      description={t('integrationEdit.apiKeyDesc')}
                      type="password"
                    />
                  )}
                  {providerType !== 'webhook' && (
                    <Textfield
                      label={t('integrationEdit.labelSecretKey')}
                      value={secretKey}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecretKey(e.target.value)}
                      placeholder="sk_secret_..."
                      description={t('integrationEdit.secretKeyDesc')}
                      type="password"
                    />
                  )}
                </Stack>
              </div>
            </Card>

            {/* ── Webhook config (for webhook types) ── */}
            {providerType === 'webhook' && (
              <Card data-color="neutral">
                <div className={styles.cardInner}>
                  <div className={styles.inlineHeader}>
                    <IconBox icon={<ExternalLinkIcon />} variant="warning" size="sm" />
                    <div className={styles.inlineHeaderText}>
                      <Heading data-size="2xs" className={styles.noMargin}>
                        {t('integrationEdit.webhookConfig')}
                      </Heading>
                      <Paragraph data-size="xs" className={styles.subtleText}>
                        {t('integrationEdit.webhookConfigDesc')}
                      </Paragraph>
                    </div>
                  </div>

                  <Stack direction="vertical" spacing="var(--ds-size-4)">
                    <Textfield
                      label={t('backoffice2.webhookUrlLabel')}
                      value={webhookUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.example.com/webhook/..."
                      description={t('integrationEdit.webhookUrlDesc')}
                    />
                    <Textfield
                      label={t('integrationEdit.labelWebhookSecret')}
                      value={webhookSecret}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWebhookSecret(e.target.value)}
                      placeholder="whsec_..."
                      description={t('integrationEdit.webhookSecretDesc')}
                      type="password"
                    />
                  </Stack>
                </div>
              </Card>
            )}

            {/* ── Calendar-specific config ── */}
            {providerType === 'calendar' && (
              <Card data-color="neutral">
                <div className={styles.cardInner}>
                  <div className={styles.inlineHeader}>
                    <IconBox icon={<CalendarIcon />} variant="warning" size="sm" />
                    <div className={styles.inlineHeaderText}>
                      <Heading data-size="2xs" className={styles.noMargin}>
                        {t('integrationEdit.calendarSettings')}
                      </Heading>
                      <Paragraph data-size="xs" className={styles.subtleText}>
                        {t('integrationEdit.calendarSettingsDesc')}
                      </Paragraph>
                    </div>
                  </div>
                  <Textfield
                    label={t('integrationEdit.labelCalendarId')}
                    value={calendarId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalendarId(e.target.value)}
                    placeholder="primary"
                    description={t('integrationEdit.calendarIdDesc')}
                  />
                </div>
              </Card>
            )}

            {/* ── Email-specific config ── */}
            {providerType === 'email' && (
              <Card data-color="neutral">
                <div className={styles.cardInner}>
                  <div className={styles.inlineHeader}>
                    <IconBox icon={<MailIcon />} variant="accent" size="sm" />
                    <div className={styles.inlineHeaderText}>
                      <Heading data-size="2xs" className={styles.noMargin}>
                        {t('integrationEdit.emailSettings')}
                      </Heading>
                      <Paragraph data-size="xs" className={styles.subtleText}>
                        {t('integrationEdit.emailSettingsDesc')}
                      </Paragraph>
                    </div>
                  </div>
                  <Stack direction="vertical" spacing="var(--ds-size-4)">
                    <Textfield
                      label={t('integrationEdit.labelFromEmail')}
                      value={fromEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromEmail(e.target.value)}
                      placeholder="noreply@example.com"
                      description={t('integrationEdit.fromEmailDesc')}
                    />
                    <Textfield
                      label={t('integrationEdit.labelFromName')}
                      value={fromName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromName(e.target.value)}
                      placeholder="Kulturhuset"
                      description={t('integrationEdit.fromNameDesc')}
                    />
                  </Stack>
                </div>
              </Card>
            )}

            {/* ── Accounting-specific config ── */}
            {providerType === 'accounting' && (
              <Card data-color="neutral">
                <div className={styles.cardInner}>
                  <div className={styles.inlineHeader}>
                    <IconBox icon={<SettingsIcon />} variant="accent" size="sm" />
                    <div className={styles.inlineHeaderText}>
                      <Heading data-size="2xs" className={styles.noMargin}>
                        {t('integrationEdit.accountingSettings')}
                      </Heading>
                      <Paragraph data-size="xs" className={styles.subtleText}>
                        {t('integrationEdit.accountingSettingsDesc')}
                      </Paragraph>
                    </div>
                  </div>
                  <Textfield
                    label={t('integrationEdit.labelOrgNumber')}
                    value={companyId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyId(e.target.value)}
                    placeholder="123456789"
                    description={t('integrationEdit.orgNumberDesc')}
                  />
                </div>
              </Card>
            )}
          </Stack>
        );

      // ═══════════════════ Step 3: Review ═══════════════════
      case 'review':
        return (
          <Stack direction="vertical" spacing="var(--ds-size-6)">
            {/* ── Summary card ── */}
            <Card data-color="neutral">
              <div className={styles.cardInner}>
                <div className={styles.inlineHeader}>
                  <IconBox icon={<CheckCircleIcon />} variant="success" size="sm" />
                  <div className={styles.inlineHeaderText}>
                    <Heading data-size="2xs" className={styles.noMargin}>
                      {t('integrationEdit.stepReview')}
                    </Heading>
                    <Paragraph data-size="xs" className={styles.subtleText}>
                      {t('integrationEdit.reviewDesc')}
                    </Paragraph>
                  </div>
                </div>

                <Stack direction="vertical" spacing="var(--ds-size-3)">
                  <MetadataRow
                    icon={<ExternalLinkIcon />}
                    label={t('integrationEdit.reviewProvider')}
                    value={provider?.name ?? '—'}
                    size="sm"
                  />
                  <MetadataRow label={t('integrationEdit.reviewName')} value={integrationName || '—'} size="sm" />
                  <MetadataRow
                    label={t('integrationEdit.reviewType')}
                    value={typeMeta?.label ?? provider?.type ?? '—'}
                    size="sm"
                  />
                  <MetadataRow
                    label={t('integrationEdit.labelEnvironment')}
                    value={
                      environment === 'sandbox' ? t('integrationEdit.envSandbox') : t('integrationEdit.envProduction')
                    }
                    size="sm"
                  />
                  {apiKey && (
                    <MetadataRow
                      label={t('integrationEdit.labelApiKey')}
                      value={`${apiKey.slice(0, 4)}${'•'.repeat(12)}`}
                      size="sm"
                    />
                  )}
                  {webhookUrl && <MetadataRow label={t('backoffice2.webhookUrlLabel')} value={webhookUrl} size="sm" />}
                  {calendarId && (
                    <MetadataRow label={t('integrationEdit.labelCalendarId')} value={calendarId} size="sm" />
                  )}
                  {companyId && <MetadataRow label={t('integrationEdit.reviewOrgNr')} value={companyId} size="sm" />}
                  {fromEmail && <MetadataRow label={t('integrationEdit.labelFromEmail')} value={fromEmail} size="sm" />}
                  {fromName && <MetadataRow label={t('integrationEdit.labelFromName')} value={fromName} size="sm" />}
                </Stack>
              </div>
            </Card>

            {/* ── Metadata card ── */}
            <Card data-color="neutral">
              <div className={styles.cardInner}>
                <div className={styles.inlineHeader}>
                  <IconBox icon={<SettingsIcon />} variant="neutral" size="sm" />
                  <div className={styles.inlineHeaderText}>
                    <Heading data-size="2xs" className={styles.noMargin}>
                      {t('integrationEdit.metadata')}
                    </Heading>
                  </div>
                </div>
                <Stack direction="vertical" spacing="var(--ds-size-2)">
                  <MetadataRow
                    label={t('integrationEdit.reviewMode')}
                    value={isEditMode ? t('integrationEdit.modeEdit') : t('integrationEdit.modeNew')}
                    size="sm"
                  />
                  <MetadataRow
                    label={t('integrationEdit.reviewChangedBy')}
                    value={user?.name ?? user?.email ?? '—'}
                    size="sm"
                  />
                </Stack>
              </div>
            </Card>
          </Stack>
        );

      default:
        return null;
    }
  };

  // ─── Stepper tabs (listing wizard pattern) ───
  const stepTabs = WIZARD_STEPS.map((s) => ({ id: s.id, label: s.label }));

  // ─────────────────────────── Render ───────────────────────────

  return (
    <PageContentLayout>
      <DashboardPageHeader
        title={isEditMode ? t('integrationEdit.wizardEditTitle') : t('integrationEdit.wizardCreateTitle')}
        subtitle={isEditMode ? t('integrationEdit.wizardEditDesc') : t('integrationEdit.wizardCreateDesc')}
      />

      {/* ── Save status alert ── */}
      {saveStatus !== 'idle' && (
        <div className={saveStatus === 'success' ? styles.saveSuccess : styles.saveError}>
          <span className={styles.saveIcon}>{saveStatus === 'success' ? '✓' : '✕'}</span>
          <Paragraph data-size="sm" className={styles.saveMessage}>
            {saveStatus === 'success' ? t('integrationEdit.saveSuccess') : t('integrationEdit.saveError')}
          </Paragraph>
        </div>
      )}

      {/* ── Wizard stepper tabs ── */}
      <div className={styles.stepper}>
        <PillTabs
          tabs={stepTabs}
          activeTab={currentStep}
          onTabChange={(id) => setCurrentStep(id as WizardStep)}
          variant="wizard"
        />
      </div>

      {/* ── Content ── */}
      <div className={styles.content}>{renderStepContent()}</div>

      {/* ── 3-zone footer (listing wizard pattern) ── */}
      <div className={styles.wizardFooter}>
        <div className={styles.footerLeft}>
          {!isFirstStep && (
            <Button variant="secondary" onClick={handlePrev}>
              {t('integrationEdit.buttonPrevious')}
            </Button>
          )}
        </div>
        <div className={styles.footerCenter}>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? t('integrationEdit.buttonSaving') : t('integrationEdit.buttonSave')}
          </Button>
          <Button variant="tertiary" onClick={handleCancel}>
            {t('integrationEdit.buttonCancel')}
          </Button>
        </div>
        <div className={styles.footerRight}>
          {isLastStep ? (
            <Button variant="primary" onClick={handleSaveDraft} disabled={isSaving}>
              {isSaving
                ? t('integrationEdit.buttonPublishing')
                : isEditMode
                  ? t('integrationEdit.buttonUpdate')
                  : t('integrationEdit.buttonCreate')}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext} disabled={!canProceed}>
              {t('integrationEdit.buttonNext')}
            </Button>
          )}
        </div>
      </div>
    </PageContentLayout>
  );
}
