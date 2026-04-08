/**
 * Email Template Edit Page
 * Multi-step wizard for creating and editing email templates.
 * Matches the ListingWizard pattern from events.
 *
 * Steps:
 *  1. Generelt — name, category (card grid), subject line
 *  2. Innhold — rich text body editor with template variable tokens
 *  3. Gjennomgang — preview + test send
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '@digilist-saas/i18n';
import {
    Button,
    Heading,
    Paragraph,
    Card,
    Stack,
    Spinner,
    PillTabs,
    Textfield,
    RichTextEditor,
    RichTextDisplay,
    MetadataRow,
    StatusTag,
    Icon,
    PageContentLayout,
    MailIcon,
    SendIcon,
    CheckCircleIcon,
    CalendarIcon,
    SettingsIcon,
    EyeIcon,
    useToast,
    ErrorState,
} from '@digilist-saas/ds';
import { useAuthBridge } from '@digilist-saas/app-shell';
import { useEmailTemplates, useCreateEmailTemplate, useUpdateEmailTemplate, useSendTestEmail } from '@digilist-saas/sdk';
import styles from './email-template-edit.module.css';

// ─────────────────────────── Constants ───────────────────────────

const WIZARD_STEP_IDS = ['general', 'content', 'review'] as const;

type BadgeColor = 'success' | 'warning' | 'info' | 'neutral';

const CATEGORY_KEYS = ['booking', 'notification', 'reminder', 'invoice', 'welcome', 'system'] as const;

// ─── Category SVG icon components ───

function BookingIcon({ size = 28 }: { size?: number }) {
    return (
        <Icon size={size} strokeWidth={1.5}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M8 14h.01" />
            <path d="M12 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M12 18h.01" />
        </Icon>
    );
}

function NotificationIcon({ size = 28 }: { size?: number }) {
    return (
        <Icon size={size} strokeWidth={1.5}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Icon>
    );
}

function ReminderIcon({ size = 28 }: { size?: number }) {
    return (
        <Icon size={size} strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </Icon>
    );
}

function InvoiceIcon({ size = 28 }: { size?: number }) {
    return (
        <Icon size={size} strokeWidth={1.5}>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
        </Icon>
    );
}

function WelcomeIcon({ size = 28 }: { size?: number }) {
    return (
        <Icon size={size} strokeWidth={1.5}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </Icon>
    );
}

function SystemIcon({ size = 28 }: { size?: number }) {
    return (
        <Icon size={size} strokeWidth={1.5}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Icon>
    );
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
    booking: BookingIcon,
    notification: NotificationIcon,
    reminder: ReminderIcon,
    invoice: InvoiceIcon,
    welcome: WelcomeIcon,
    system: SystemIcon,
};

// Variable token structure — labels are resolved via i18n at render time
const TEMPLATE_VARIABLE_DEFS = [
    {
        groupKey: 'varGroupUser',
        tokens: [
            { token: '{{user.name}}', labelKey: 'varUserName', example: 'Ola Nordmann' },
            { token: '{{user.email}}', labelKey: 'varUserEmail', example: 'ola@example.no' },
        ],
    },
    {
        groupKey: 'varGroupBooking',
        tokens: [
            { token: '{{booking.date}}', labelKey: 'varBookingDate', example: '17. februar 2026' },
            { token: '{{booking.time}}', labelKey: 'varBookingTime', example: '14:00 – 16:00' },
            { token: '{{booking.listing}}', labelKey: 'varBookingListing', example: 'Møterom A' },
            { token: '{{booking.reference}}', labelKey: 'varBookingReference', example: 'BK-20260217-001' },
        ],
    },
    {
        groupKey: 'varGroupOrganization',
        tokens: [
            { token: '{{org.name}}', labelKey: 'varOrgName', example: 'Eksempel kommune' },
            { token: '{{tenant.name}}', labelKey: 'varTenantName', example: 'Kulturhuset' },
        ],
    },
    {
        groupKey: 'varGroupInvoice',
        tokens: [
            { token: '{{invoice.number}}', labelKey: 'varInvoiceNumber', example: 'FAK-2026-042' },
            { token: '{{invoice.amount}}', labelKey: 'varInvoiceAmount', example: '1 250,00 kr' },
            { token: '{{invoice.dueDate}}', labelKey: 'varInvoiceDueDate', example: '3. mars 2026' },
        ],
    },
];

// ─────────────────────────── Component ───────────────────────────

export function EmailTemplateEditPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const t = useT();

    // i18n-aware wizard steps
    const wizardSteps = useMemo(() => [
        { id: 'general', label: t('emailTemplates.stepGeneral') },
        { id: 'content', label: t('emailTemplates.stepContent') },
        { id: 'review', label: t('emailTemplates.stepReview') },
    ], [t]);

    // i18n-aware category meta
    const categoryMeta = useMemo((): Record<string, { label: string; statusColor: BadgeColor; description: string }> => ({
        booking: { label: t('emailTemplates.categoryBooking'), statusColor: 'info', description: t('emailTemplates.categoryBookingDesc') },
        notification: { label: t('emailTemplates.categoryNotification'), statusColor: 'warning', description: t('emailTemplates.categoryNotificationDesc') },
        reminder: { label: t('emailTemplates.categoryReminder'), statusColor: 'neutral', description: t('emailTemplates.categoryReminderDesc') },
        invoice: { label: t('emailTemplates.categoryInvoice'), statusColor: 'success', description: t('emailTemplates.categoryInvoiceDesc') },
        welcome: { label: t('emailTemplates.categoryWelcome'), statusColor: 'info', description: t('emailTemplates.categoryWelcomeDesc') },
        system: { label: t('emailTemplates.categorySystem'), statusColor: 'neutral', description: t('emailTemplates.categorySystemDesc') },
    }), [t]);

    // i18n-aware template variables
    const templateVariables = useMemo(() =>
        TEMPLATE_VARIABLE_DEFS.map((group) => ({
            group: t(`emailTemplates.${group.groupKey}`),
            tokens: group.tokens.map((tok) => ({
                token: tok.token,
                label: t(`emailTemplates.${tok.labelKey}`),
                example: tok.example,
            })),
        })),
        [t]
    );
    const { user } = useAuthBridge();
    const { showToast } = useToast();

    const isEditMode = Boolean(slug);

    // Fetch templates to find the one we're editing
    const { templates, isLoading: isLoadingTemplates, error } = useEmailTemplates();

    const existingTemplate = useMemo(() => {
        if (!slug) return null;
        return templates.find((tmpl) => tmpl.id === slug) ?? null;
    }, [slug, templates]);

    // ─── Wizard state ───
    const [currentStep, setCurrentStep] = useState(0);
    const currentStepId = WIZARD_STEP_IDS[currentStep] ?? 'general';

    // ─── Form state ───
    const [formName, setFormName] = useState('');
    const [formSubject, setFormSubject] = useState('');
    const [formBody, setFormBody] = useState('');
    const [formCategory, setFormCategory] = useState('booking');
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [formInitialized, setFormInitialized] = useState(false);

    // Populate form fields when editing an existing template
    useMemo(() => {
        if (existingTemplate && !formInitialized) {
            setFormName(existingTemplate.name);
            setFormSubject(existingTemplate.subject ?? '');
            setFormBody(existingTemplate.body);
            setFormCategory(existingTemplate.category);
            setFormInitialized(true);
        }
    }, [existingTemplate, formInitialized]);

    // ─── Navigation ───
    const canGoNext = currentStep < wizardSteps.length - 1;
    const canGoPrev = currentStep > 0;
    const isLastStep = currentStep === wizardSteps.length - 1;

    const nextStep = useCallback(() => {
        if (canGoNext) setCurrentStep((s) => s + 1);
    }, [canGoNext]);

    const prevStep = useCallback(() => {
        if (canGoPrev) setCurrentStep((s) => s - 1);
    }, [canGoPrev]);

    const goToStep = useCallback((tabId: string) => {
        const idx = WIZARD_STEP_IDS.indexOf(tabId as typeof WIZARD_STEP_IDS[number]);
        if (idx >= 0) setCurrentStep(idx);
    }, []);

    // ─── Handlers ───
    const handleInsertVariable = useCallback((token: string) => {
        setFormBody((prev) => prev + token);
    }, []);

    const { createEmailTemplate } = useCreateEmailTemplate();
    const { updateEmailTemplate } = useUpdateEmailTemplate();

    const handleSave = useCallback(async () => {
        if (!formName.trim() || !formSubject.trim()) return;
        const tenantId = user?.tenantId;
        if (!tenantId) return;
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            if (isEditMode && existingTemplate) {
                await updateEmailTemplate({
                    id: existingTemplate.id,
                    name: formName.trim(),
                    subject: formSubject.trim(),
                    body: formBody,
                    category: formCategory,
                    modifiedBy: user?.name ?? user?.email ?? undefined,
                });
            } else {
                await createEmailTemplate({
                    tenantId,
                    name: formName.trim(),
                    subject: formSubject.trim(),
                    body: formBody,
                    category: formCategory,
                    isActive: true,
                    modifiedBy: user?.name ?? user?.email ?? undefined,
                });
            }
            setSaveStatus('success');
            setTimeout(() => {
                setSaveStatus('idle');
                navigate('/email-templates');
            }, 1200);
        } catch {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    }, [formName, formSubject, formBody, formCategory, existingTemplate, isEditMode, user, navigate, createEmailTemplate, updateEmailTemplate]);

    const { sendTestEmail } = useSendTestEmail();

    const handleSendTest = useCallback(async () => {
        if (!user?.email || !existingTemplate?.id) return;
        setIsSendingTest(true);
        try {
            const result = await sendTestEmail({ templateId: existingTemplate.id, recipientEmail: user.email });
            if (result.success) {
                showToast({ title: t('emailTemplates.testEmailSent'), variant: 'success' });
            }
        } catch {
            showToast({ title: t('emailTemplates.testEmailError'), variant: 'error' });
        } finally {
            setIsSendingTest(false);
        }
    }, [user, existingTemplate, sendTestEmail, showToast, t]);

    const handleCancel = useCallback(() => {
        navigate('/email-templates');
    }, [navigate]);

    // ─── Preview with sample data ───
    const previewHtml = useMemo(() => {
        if (!formBody) return '';
        const sampleData: Record<string, string> = {};
        templateVariables.forEach((group) =>
            group.tokens.forEach((v) => { sampleData[v.token] = v.example; })
        );
        let output = formBody;
        Object.entries(sampleData).forEach(([token, value]) => {
            output = output.replaceAll(token, `<strong>${value}</strong>`);
        });
        return output;
    }, [formBody]);

    // ─── Error ───
    if (error) {
        return (
            <PageContentLayout>
                <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
            </PageContentLayout>
        );
    }

    // ─── Loading ───
    if (isEditMode && isLoadingTemplates) {
        return (
            <PageContentLayout>
                <div className={styles.loading}>
                    <Spinner aria-label={t('emailTemplates.loadingTemplate')} />
                    <Paragraph>{t('emailTemplates.loadingTemplate')}</Paragraph>
                </div>
            </PageContentLayout>
        );
    }

    // ─── Step Rendering ───
    const renderStep = () => {
        switch (currentStepId) {
            case 'general':
                return (
                    <Stack direction="vertical" spacing="var(--ds-size-6)">
                        {/* ── Category card grid ── */}
                        <Card data-color="neutral">
                            <div className={styles.cardInner}>
                                <div className={styles.inlineHeader}>
                                    <div className={`${styles.sectionIconBox} ${styles.sectionIconBoxAccent}`}>
                                        <Icon size={20}>
                                            <rect x="3" y="3" width="7" height="7" />
                                            <rect x="14" y="3" width="7" height="7" />
                                            <rect x="14" y="14" width="7" height="7" />
                                            <rect x="3" y="14" width="7" height="7" />
                                        </Icon>
                                    </div>
                                    <div>
                                        <Heading level={3} data-size="xs" className={styles.inlineHeaderTitle}>
                                            {t('emailTemplates.sectionTemplateType')}
                                        </Heading>
                                        <Paragraph data-size="sm" className={styles.inlineHeaderSubtitle}>
                                            {t('emailTemplates.sectionTemplateTypeDesc')}
                                        </Paragraph>
                                    </div>
                                </div>
                                <div className={styles.categoryGrid}>
                                    {CATEGORY_KEYS.map((key) => {
                                        const meta = categoryMeta[key];
                                        const isSelected = formCategory === key;
                                        const IconComponent = CATEGORY_ICON_MAP[key] || SystemIcon;
                                        return (
                                            <Button
                                                key={key}
                                                type="button"
                                                variant={isSelected ? 'primary' : 'secondary'}
                                                onClick={() => setFormCategory(key)}
                                                className={styles.categoryCard}
                                                data-selected={isSelected}
                                                aria-pressed={isSelected}
                                            >
                                                <div className={styles.categoryIcon} data-selected={isSelected}>
                                                    <IconComponent size={28} />
                                                </div>
                                                <Paragraph data-size="sm" className={styles.categoryLabel} data-selected={isSelected}>
                                                    {meta.label}
                                                </Paragraph>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>

                        {/* ── Name & Subject ── */}
                        <Card data-color="neutral">
                            <div className={styles.cardInner}>
                                <div className={styles.inlineHeader}>
                                    <div className={`${styles.sectionIconBox} ${styles.sectionIconBoxInfo}`}>
                                        <MailIcon />
                                    </div>
                                    <div>
                                        <Heading level={3} data-size="xs" className={styles.inlineHeaderTitle}>
                                            {t('emailTemplates.sectionNameSubject')}
                                        </Heading>
                                        <Paragraph data-size="sm" className={styles.inlineHeaderSubtitle}>
                                            {t('emailTemplates.sectionNameSubjectDesc')}
                                        </Paragraph>
                                    </div>
                                </div>
                                <div className={styles.fieldStack}>
                                    <Textfield
                                        label={t('emailTemplates.templateName')}
                                        value={formName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
                                        placeholder={t('emailTemplates.namePlaceholder')}
                                    />
                                    <Textfield
                                        label={t('emailTemplates.subject')}
                                        value={formSubject}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormSubject(e.target.value)}
                                        placeholder={t('emailTemplates.subjectPlaceholder')}
                                        description={t('emailTemplates.subjectHint')}
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* ── Edit metadata (when editing) ── */}
                        {existingTemplate && (
                            <Card data-color="neutral">
                                <div className={styles.cardInner}>
                                    <div className={styles.inlineHeader}>
                                        <div className={`${styles.sectionIconBox} ${styles.sectionIconBoxWarning}`}>
                                            <SettingsIcon />
                                        </div>
                                        <div>
                                            <Heading level={3} data-size="xs" className={styles.inlineHeaderTitle}>
                                                {t('emailTemplates.sectionTemplateInfo')}
                                            </Heading>
                                            <Paragraph data-size="sm" className={styles.inlineHeaderSubtitle}>
                                                {t('emailTemplates.sectionTemplateInfoDesc')}
                                            </Paragraph>
                                        </div>
                                    </div>
                                    <Stack direction="horizontal" spacing="var(--ds-size-6)">
                                        <MetadataRow
                                            icon={<CalendarIcon />}
                                            label={t('emailTemplates.lastModified')}
                                            value={existingTemplate.lastModified
                                                ? new Date(existingTemplate.lastModified).toLocaleDateString('nb-NO')
                                                : '—'}
                                            size="sm"
                                        />
                                        <MetadataRow
                                            icon={<SendIcon />}
                                            label={t('emailTemplates.columnSent')}
                                            value={String(existingTemplate.sendCount ?? 0)}
                                            size="sm"
                                        />
                                        {existingTemplate.isDefault && (
                                            <MetadataRow
                                                icon={<SettingsIcon />}
                                                label={t('emailTemplates.type')}
                                                value={t('emailTemplates.defaultTemplate')}
                                                badge={<StatusTag color="info" size="sm">{t('emailTemplates.standard')}</StatusTag>}
                                                size="sm"
                                            />
                                        )}
                                    </Stack>
                                </div>
                            </Card>
                        )}
                    </Stack>
                );

            case 'content':
                return (
                    <Stack direction="vertical" spacing="var(--ds-size-5)">
                        <Stack direction="vertical" spacing="var(--ds-size-1)">
                            <Heading level={2} data-size="sm">{t('emailTemplates.sectionContent')}</Heading>
                            <Paragraph data-size="sm" className={styles.subtleText}>
                                {t('emailTemplates.sectionContentDesc')}
                            </Paragraph>
                        </Stack>

                        <Stack direction="horizontal" spacing="var(--ds-size-4)">
                            <div className={styles.editorWrapper}>
                                <RichTextEditor
                                    label={t('emailTemplates.body')}
                                    description={t('emailTemplates.bodyDesc')}
                                    value={formBody}
                                    onChange={setFormBody}
                                    placeholder={t('emailTemplates.bodyPlaceholder')}
                                    toolbar="full"
                                    minHeight={350}
                                    maxLength={5000}
                                />
                            </div>

                            {/* Variable Sidebar */}
                            <Card className={styles.variableSidebarPadded}>
                                <Stack direction="vertical" spacing="var(--ds-size-3)">
                                    <Stack direction="vertical" spacing="var(--ds-size-1)">
                                        <Heading data-size="2xs" className={styles.noMargin}>
                                            {t('emailTemplates.variablesTitle')}
                                        </Heading>
                                        <Paragraph data-size="xs" className={styles.subtleText}>
                                            {t('emailTemplates.variablesInsertHint')}
                                        </Paragraph>
                                    </Stack>

                                    {templateVariables.map((group) => (
                                        <Stack key={group.group} direction="vertical" spacing="var(--ds-size-1)">
                                            <Paragraph data-size="xs" className={styles.variableGroupLabel}>
                                                {group.group}
                                            </Paragraph>
                                            {group.tokens.map((v) => (
                                                <Button
                                                    key={v.token}
                                                    variant="tertiary"
                                                    data-size="sm"
                                                    onClick={() => handleInsertVariable(v.token)}
                                                    className={styles.variableTokenButton}
                                                >
                                                    <code className={styles.variableTokenCode}>
                                                        {v.token}
                                                    </code>
                                                </Button>
                                            ))}
                                        </Stack>
                                    ))}
                                </Stack>
                            </Card>
                        </Stack>
                    </Stack>
                );

            case 'review':
                return (
                    <Stack direction="vertical" spacing="var(--ds-size-5)">
                        <Stack direction="vertical" spacing="var(--ds-size-1)">
                            <Heading level={2} data-size="2xs">{t('emailTemplates.sectionReview')}</Heading>
                            <Paragraph data-size="xs" className={styles.subtleText}>
                                {t('emailTemplates.sectionReviewDesc')}
                            </Paragraph>
                        </Stack>

                        {/* Summary table */}
                        <Card className={styles.reviewSummaryCard}>
                            <Stack direction="vertical" spacing="var(--ds-size-3)">
                                <MetadataRow
                                    label={t('emailTemplates.reviewTemplateName')}
                                    value={formName || t('emailTemplates.reviewNotSet')}
                                    size="sm"
                                />
                                <MetadataRow
                                    label={t('emailTemplates.reviewCategory')}
                                    value={categoryMeta[formCategory] ? (
                                        <StatusTag color={categoryMeta[formCategory].statusColor} size="sm">
                                            {categoryMeta[formCategory].label}
                                        </StatusTag>
                                    ) : formCategory}
                                    size="sm"
                                />
                                <MetadataRow
                                    label={t('emailTemplates.reviewSubject')}
                                    value={formSubject || t('emailTemplates.reviewNotSet')}
                                    size="sm"
                                />
                            </Stack>
                        </Card>

                        {/* Email Preview */}
                        <Card className={styles.previewCard}>
                            <div className={styles.previewHeader}>
                                <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
                                    <EyeIcon />
                                    <Heading data-size="2xs" className={styles.noMargin}>{t('emailTemplates.previewTitle')}</Heading>
                                </Stack>
                            </div>
                            <Stack direction="vertical" spacing="var(--ds-size-3)" className={styles.previewBody}>
                                {/* Email header simulation */}
                                <Card className={styles.previewEmailHeader}>
                                    <Stack direction="vertical" spacing="var(--ds-size-1)">
                                        <MetadataRow icon={<MailIcon />} label={t('emailTemplates.previewFrom')} value={import.meta.env.VITE_EMAIL_FROM || 'noreply@example.com'} size="sm" />
                                        <MetadataRow icon={<MailIcon />} label={t('emailTemplates.previewTo')} value={user?.email || 'bruker@example.no'} size="sm" />
                                        <MetadataRow icon={<MailIcon />} label={t('emailTemplates.previewSubject')} value={formSubject || t('emailTemplates.previewNoSubject')} size="sm" />
                                    </Stack>
                                </Card>

                                {/* Rendered body */}
                                <div className={`${styles.previewContainer} ${styles.previewRendered}`}>
                                    {previewHtml ? (
                                        <RichTextDisplay content={previewHtml} />
                                    ) : (
                                        <Paragraph data-size="sm" className={styles.previewEmpty}>
                                            {t('emailTemplates.previewEmpty')}
                                        </Paragraph>
                                    )}
                                </div>
                            </Stack>
                        </Card>

                        {/* Test send */}
                        {user?.email && (
                            <Stack direction="horizontal" spacing="var(--ds-size-3)" align="center">
                                <Button
                                    variant="secondary"
                                    data-size="sm"
                                    onClick={handleSendTest}
                                    disabled={isSendingTest || !formSubject.trim()}
                                >
                                    <SendIcon />
                                    {isSendingTest ? t('emailTemplates.buttonSending') : t('emailTemplates.buttonSendTestTo', { email: user.email })}
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                );

            default:
                return <Paragraph>{t('emailTemplates.unknownStep')}</Paragraph>;
        }
    };

    // ─────────────────────────── Render ───────────────────────────

    return (
        <PageContentLayout>
            <div className={styles.root}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Heading level={1} data-size="lg" className={styles.wizardTitle}>
                            {isEditMode ? t('emailTemplates.wizardEditTitle') : t('emailTemplates.wizardCreateTitle')}
                        </Heading>
                        <Paragraph data-size="sm" className={styles.wizardSubtitle}>
                            {isEditMode
                                ? t('emailTemplates.wizardEditDesc')
                                : t('emailTemplates.wizardCreateDesc')}
                        </Paragraph>
                    </div>
                </div>

                {/* Save status toast */}
                {saveStatus !== 'idle' && (
                    <div className={saveStatus === 'success' ? styles.saveSuccess : styles.saveError}>
                        <span className={styles.saveIcon}>{saveStatus === 'success' ? '✓' : '✕'}</span>
                        <Paragraph data-size="sm" className={styles.saveMessage}>
                            {saveStatus === 'success' ? t('emailTemplates.saveSuccess') : t('emailTemplates.saveError')}
                        </Paragraph>
                    </div>
                )}

                {/* Wizard Stepper */}
                <div className={styles.stepper}>
                    <PillTabs
                        tabs={wizardSteps}
                        activeTab={currentStepId}
                        onTabChange={goToStep}
                        variant="wizard"
                        fullWidth={true}
                        ariaLabel={t('emailTemplates.wizardStepLabel')}
                    />
                </div>

                {/* Step Content */}
                <div className={styles.content}>
                    {renderStep()}
                </div>

                {/* Footer */}
                <div className={styles.wizardFooter}>
                    <div className={styles.footerLeft}>
                        {canGoPrev && (
                            <Button variant="secondary" onClick={prevStep}>
                                {t('emailTemplates.buttonPrevious')}
                            </Button>
                        )}
                    </div>
                    <div className={styles.footerCenter}>
                        <Button variant="secondary" onClick={handleSave} disabled={isSaving || !formName.trim() || !formSubject.trim()}>
                            {isSaving ? t('emailTemplates.buttonSaving') : t('emailTemplates.save')}
                        </Button>
                        <Button variant="tertiary" onClick={handleCancel}>
                            {t('emailTemplates.buttonCancel')}
                        </Button>
                    </div>
                    <div className={styles.footerRight}>
                        {isLastStep ? (
                            <Button variant="primary" onClick={handleSave} disabled={isSaving || !formName.trim() || !formSubject.trim()}>
                                <CheckCircleIcon />
                                {isSaving ? t('emailTemplates.buttonPublishing') : t('emailTemplates.buttonPublish')}
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={nextStep} disabled={!canGoNext}>
                                {t('emailTemplates.buttonNext')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </PageContentLayout>
    );
}
