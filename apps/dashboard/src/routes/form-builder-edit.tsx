/**
 * Form Builder Edit Page
 * Multi-step wizard for creating and editing form definitions.
 * Matches the ListingWizard pattern from events.
 *
 * Steps:
 *  1. Generelt — name, category (card grid), description, success message
 *  2. Felt — field palette + canvas (add/edit/reorder/delete fields)
 *  3. Forhåndsvisning — live form preview
 *  4. Gjennomgang — summary + publish toggle
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '@digipicks/i18n';
import {
  Button,
  Heading,
  Paragraph,
  Card,
  Stack,
  Grid,
  Spinner,
  PillTabs,
  Textfield,
  Textarea,
  Tag,
  RichTextEditor,
  EmptyState,
  StatusTag,
  MetadataRow,
  Icon,
  PageContentLayout,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  CalendarIcon,
  ChartIcon,
  EyeIcon,
  SettingsIcon,
  MoreVerticalIcon,
  ErrorState,
} from '@digipicks/ds';
import { useFormDefinitions, useCreateFormDefinition, useUpdateFormDefinition } from '@digipicks/sdk';
import { useAuthBridge } from '@digipicks/app-shell';
import styles from './form-builder-edit.module.css';

// ─────────────────────────── Constants ───────────────────────────

type BadgeColor = 'info' | 'warning' | 'success' | 'neutral';

// ─── Category SVG icon components ───

function BookingFormIcon({ size = 28 }: { size?: number }) {
  return (
    <Icon size={size} strokeWidth={1.5}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </Icon>
  );
}

function ApplicationFormIcon({ size = 28 }: { size?: number }) {
  return (
    <Icon size={size} strokeWidth={1.5}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </Icon>
  );
}

function FeedbackFormIcon({ size = 28 }: { size?: number }) {
  return (
    <Icon size={size} strokeWidth={1.5}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  );
}

function RegistrationFormIcon({ size = 28 }: { size?: number }) {
  return (
    <Icon size={size} strokeWidth={1.5}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </Icon>
  );
}

function SurveyFormIcon({ size = 28 }: { size?: number }) {
  return (
    <Icon size={size} strokeWidth={1.5}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Icon>
  );
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  booking: BookingFormIcon,
  application: ApplicationFormIcon,
  feedback: FeedbackFormIcon,
  registration: RegistrationFormIcon,
  survey: SurveyFormIcon,
};

// ─────────────────────────── Types ───────────────────────────

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  helpText?: string;
  validation?: { min?: number; max?: number; pattern?: string };
}

// ─────────────────────────── Helpers ───────────────────────────

let fieldIdCounter = 0;
const generateFieldId = () => `field-${Date.now()}-${++fieldIdCounter}`;

// ─────────────────────────── Component ───────────────────────────

export function FormBuilderEditPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const t = useT();

  const WIZARD_STEPS = useMemo(
    () => [
      { id: 'general', label: t('formBuilder.stepBasicInfo') },
      { id: 'fields', label: t('formBuilder.fieldsTitle') },
      { id: 'preview', label: t('formBuilder.previewTitle') },
      { id: 'review', label: t('formBuilder.reviewTitle') },
    ],
    [t],
  );

  const categoryMeta: Record<string, { label: string; statusColor: BadgeColor; description: string }> = useMemo(
    () => ({
      booking: {
        label: t('formBuilder.categoryBooking'),
        statusColor: 'info',
        description: t('formBuilder.sectionBasicInfoDesc'),
      },
      application: {
        label: t('formBuilder.categoryApplication'),
        statusColor: 'warning',
        description: t('formBuilder.sectionBasicInfoDesc'),
      },
      feedback: {
        label: t('formBuilder.categoryFeedback'),
        statusColor: 'success',
        description: t('formBuilder.sectionBasicInfoDesc'),
      },
      registration: {
        label: t('formBuilder.categoryRegistration'),
        statusColor: 'neutral',
        description: t('formBuilder.sectionBasicInfoDesc'),
      },
      survey: {
        label: t('formBuilder.categorySurvey'),
        statusColor: 'info',
        description: t('formBuilder.sectionBasicInfoDesc'),
      },
    }),
    [t],
  );

  const FIELD_TYPES = useMemo(
    () =>
      [
        { id: 'text', label: t('formBuilder.fieldTypeText'), icon: '𝐓', group: 'input' },
        { id: 'textarea', label: t('formBuilder.fieldTypeTextarea'), icon: '¶', group: 'input' },
        { id: 'richtext', label: t('formBuilder.fieldTypeRichtext'), icon: '✎', group: 'input' },
        { id: 'number', label: t('formBuilder.fieldTypeNumber'), icon: '#', group: 'input' },
        { id: 'email', label: t('formBuilder.fieldTypeEmail'), icon: '@', group: 'input' },
        { id: 'phone', label: t('formBuilder.fieldTypePhone'), icon: '☎', group: 'input' },
        { id: 'select', label: t('formBuilder.fieldTypeSelect'), icon: '▾', group: 'choice' },
        { id: 'radio', label: t('formBuilder.fieldTypeRadio'), icon: '◉', group: 'choice' },
        { id: 'checkbox', label: t('formBuilder.fieldTypeCheckbox'), icon: '☑', group: 'choice' },
        { id: 'date', label: t('formBuilder.fieldTypeDate'), icon: '📅', group: 'date' },
        { id: 'time', label: t('formBuilder.fieldTypeTime'), icon: '⏰', group: 'date' },
        { id: 'file', label: t('formBuilder.fieldTypeFile'), icon: '📎', group: 'media' },
        { id: 'heading', label: t('formBuilder.fieldTypeHeading'), icon: 'H', group: 'layout' },
        { id: 'paragraph', label: t('formBuilder.fieldTypeParagraph'), icon: '𝑖', group: 'layout' },
        { id: 'divider', label: t('formBuilder.fieldTypeDivider'), icon: '—', group: 'layout' },
      ] as const,
    [t],
  );

  const FIELD_GROUPS = useMemo(
    () => [
      { id: 'input', label: t('formBuilder.fieldGroupInput') },
      { id: 'choice', label: t('formBuilder.fieldGroupChoice') },
      { id: 'date', label: t('formBuilder.fieldGroupDate') },
      { id: 'media', label: t('formBuilder.fieldGroupMedia') },
      { id: 'layout', label: t('formBuilder.fieldGroupLayout') },
    ],
    [t],
  );

  const isEditMode = Boolean(slug);

  // Fetch forms to find the one we're editing
  const { forms, isLoading: isLoadingForms, error } = useFormDefinitions();

  const existingForm = useMemo(() => {
    if (!slug) return null;
    return forms.find((f) => f.id === slug) ?? null;
  }, [slug, forms]);

  // ─── Wizard state ───
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepId = WIZARD_STEPS[currentStep]?.id ?? 'general';

  // ─── Form state ───
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('booking');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formInitialized, setFormInitialized] = useState(false);

  // Populate form from existing data
  useMemo(() => {
    if (existingForm && !formInitialized) {
      setFormName(existingForm.name);
      setFormDescription(existingForm.description ?? '');
      setFormCategory(existingForm.category);
      setFormSuccessMessage(existingForm.successMessage ?? '');
      setFields(existingForm.fields ?? []);
      setFormInitialized(true);
    }
  }, [existingForm, formInitialized]);

  // ─── Navigation ───
  const canGoNext = currentStep < WIZARD_STEPS.length - 1;
  const canGoPrev = currentStep > 0;
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  const nextStep = useCallback(() => {
    if (canGoNext) setCurrentStep((s) => s + 1);
  }, [canGoNext]);

  const prevStep = useCallback(() => {
    if (canGoPrev) setCurrentStep((s) => s - 1);
  }, [canGoPrev]);

  const goToStep = useCallback((tabId: string) => {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === tabId);
    if (idx >= 0) setCurrentStep(idx);
  }, []);

  // ─── Field Operations ───
  const addField = useCallback((type: string) => {
    const fieldType = FIELD_TYPES.find((ft) => ft.id === type);
    const newField: FormField = {
      id: generateFieldId(),
      type,
      label: fieldType?.label || type,
      required: false,
      options: ['select', 'radio', 'checkbox'].includes(type)
        ? ['Alternativ 1', 'Alternativ 2', 'Alternativ 3']
        : undefined,
    };
    setFields((prev) => [...prev, newField]);
    setEditingFieldId(newField.id);
  }, []);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    setEditingFieldId((prev) => (prev === fieldId ? null : prev));
  }, []);

  const moveField = useCallback((index: number, direction: 'up' | 'down') => {
    setFields((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
  }, []);

  const { user } = useAuthBridge();
  const { createFormDefinition } = useCreateFormDefinition();
  const { updateFormDefinition } = useUpdateFormDefinition();

  // ─── Save / Cancel ───
  const handleSave = useCallback(async () => {
    if (!formName.trim()) return;
    const tenantId = user?.tenantId;
    if (!tenantId) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      if (isEditMode && existingForm) {
        await updateFormDefinition({
          id: existingForm.id,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          category: formCategory,
          fields,
          successMessage: formSuccessMessage.trim() || undefined,
        });
      } else {
        await createFormDefinition({
          tenantId,
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          category: formCategory,
          fields,
          isPublished: false,
          successMessage: formSuccessMessage.trim() || undefined,
        });
      }
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        navigate('/form-builder');
      }, 1200);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [
    formName,
    formDescription,
    formCategory,
    fields,
    formSuccessMessage,
    existingForm,
    isEditMode,
    user,
    navigate,
    createFormDefinition,
    updateFormDefinition,
  ]);

  const handleCancel = useCallback(() => {
    navigate('/form-builder');
  }, [navigate]);

  // ─── Error ───
  if (error) {
    return (
      <PageContentLayout>
        <ErrorState title={t('common.error')} message={t('common.errorDescription')} />
      </PageContentLayout>
    );
  }

  // ─── Loading ───
  if (isEditMode && isLoadingForms) {
    return (
      <PageContentLayout>
        <div className={styles.loading}>
          <Spinner aria-label={t('formBuilder.loadingForm')} />
          <Paragraph>{t('formBuilder.loadingForm')}</Paragraph>
        </div>
      </PageContentLayout>
    );
  }

  // ─── Step Rendering ───
  const renderStep = () => {
    switch (currentStepId) {
      // ═══════════════════ Step 1: General ═══════════════════
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
                      {t('formBuilder.formType')}
                    </Heading>
                    <Paragraph data-size="sm" className={styles.inlineHeaderSubtitle}>
                      {t('formBuilder.formTypeDesc')}
                    </Paragraph>
                  </div>
                </div>
                <div className={styles.categoryGrid}>
                  {Object.entries(categoryMeta).map(([key, meta]) => {
                    const isSelected = formCategory === key;
                    const IconComponent = CATEGORY_ICON_MAP[key] || SurveyFormIcon;
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

            {/* ── Name & Description ── */}
            <Card data-color="neutral">
              <div className={styles.cardInner}>
                <div className={styles.inlineHeader}>
                  <div className={`${styles.sectionIconBox} ${styles.sectionIconBoxInfo}`}>
                    <Icon size={20}>
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </Icon>
                  </div>
                  <div>
                    <Heading level={3} data-size="xs" className={styles.inlineHeaderTitle}>
                      {t('formBuilder.nameAndDescription')}
                    </Heading>
                    <Paragraph data-size="sm" className={styles.inlineHeaderSubtitle}>
                      {t('formBuilder.nameAndDescriptionDesc')}
                    </Paragraph>
                  </div>
                </div>
                <div className={styles.fieldStack}>
                  <Textfield
                    label={t('formBuilder.formName')}
                    value={formName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormName(e.target.value)}
                    placeholder={t('formBuilder.formNamePlaceholder')}
                  />
                  <Textarea
                    aria-label={t('formBuilder.formDescription')}
                    value={formDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormDescription(e.target.value)}
                    placeholder={t('formBuilder.formDescPlaceholder')}
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            {/* ── Confirmation / Success message ── */}
            <Card data-color="neutral">
              <div className={styles.cardInner}>
                <div className={styles.inlineHeader}>
                  <div className={`${styles.sectionIconBox} ${styles.sectionIconBoxSuccess}`}>
                    <CheckCircleIcon />
                  </div>
                  <div>
                    <Heading level={3} data-size="xs" className={styles.inlineHeaderTitle}>
                      {t('formBuilder.confirmationMessage')}
                    </Heading>
                    <Paragraph data-size="sm" className={styles.inlineHeaderSubtitle}>
                      {t('formBuilder.confirmationMessageDesc')}
                    </Paragraph>
                  </div>
                </div>
                <div className={styles.fieldStack}>
                  <Textfield
                    label={t('formBuilder.successMessage')}
                    value={formSuccessMessage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormSuccessMessage(e.target.value)}
                    placeholder={t('formBuilder.confirmationMessagePlaceholder')}
                    description={t('formBuilder.confirmationMessageHint')}
                  />
                </div>
              </div>
            </Card>

            {/* ── Edit metadata (when editing) ── */}
            {existingForm && (
              <Card data-color="neutral">
                <div className={styles.cardInner}>
                  <div className={styles.inlineHeader}>
                    <div className={`${styles.sectionIconBox} ${styles.sectionIconBoxWarning}`}>
                      <SettingsIcon />
                    </div>
                    <div>
                      <Heading level={3} data-size="xs" className={styles.inlineHeaderTitle}>
                        {t('formBuilder.formInfo')}
                      </Heading>
                      <Paragraph data-size="sm" className={styles.inlineHeaderSubtitle}>
                        {t('formBuilder.formInfoDesc')}
                      </Paragraph>
                    </div>
                  </div>
                  <Stack direction="horizontal" spacing="var(--ds-size-6)">
                    <MetadataRow
                      icon={<CalendarIcon />}
                      label={t('formBuilder.lastModified')}
                      value={
                        existingForm.lastModified
                          ? new Date(existingForm.lastModified as number).toLocaleDateString('nb-NO')
                          : '—'
                      }
                      size="sm"
                    />
                    <MetadataRow
                      icon={<ChartIcon />}
                      label={t('formBuilder.submissions')}
                      value={String(existingForm.submissionCount ?? 0)}
                      size="sm"
                    />
                    <MetadataRow
                      icon={<CheckCircleIcon />}
                      label={t('formBuilder.reviewStatus')}
                      value={existingForm.isPublished ? t('formBuilder.published') : t('formBuilder.draft')}
                      badge={
                        <StatusTag color={existingForm.isPublished ? 'success' : 'warning'} size="sm">
                          {existingForm.isPublished ? t('formBuilder.published') : t('formBuilder.draft')}
                        </StatusTag>
                      }
                      size="sm"
                    />
                  </Stack>
                </div>
              </Card>
            )}
          </Stack>
        );

      // ═══════════════════ Step 2: Fields ═══════════════════
      case 'fields':
        return (
          <Stack direction="vertical" spacing="var(--ds-size-5)">
            <Stack direction="vertical" spacing="var(--ds-size-1)">
              <Heading level={2} data-size="sm">
                {t('formBuilder.fieldsTitle')}
              </Heading>
              <Paragraph data-size="sm" className={styles.subtleText}>
                {t('formBuilder.fieldsSubtitle')}
              </Paragraph>
            </Stack>

            <Stack direction="horizontal" spacing="var(--ds-size-4)">
              {/* Field Palette */}
              <Card className={styles.fieldPalette}>
                <Stack direction="vertical" spacing="var(--ds-size-3)">
                  <Heading data-size="2xs" className={styles.paletteHeader}>
                    {t('formBuilder.addField')}
                  </Heading>
                  {FIELD_GROUPS.map((group) => (
                    <Stack key={group.id} direction="vertical" spacing="var(--ds-size-1)">
                      <Paragraph data-size="xs" className={styles.paletteGroupLabel}>
                        {group.label}
                      </Paragraph>
                      {FIELD_TYPES.filter((ft) => ft.group === group.id).map((ft) => (
                        <Button
                          key={ft.id}
                          variant="tertiary"
                          data-size="sm"
                          onClick={() => addField(ft.id)}
                          className={styles.paletteButton}
                        >
                          <span className={styles.paletteIcon}>{ft.icon}</span>
                          {ft.label}
                        </Button>
                      ))}
                    </Stack>
                  ))}
                </Stack>
              </Card>

              {/* Canvas Area */}
              <Stack direction="vertical" spacing="var(--ds-size-2)" className={styles.canvasArea}>
                <Stack direction="horizontal" justify="between" align="center">
                  <Heading data-size="2xs" className={styles.noMargin}>
                    {t('formBuilder.formFields')}
                  </Heading>
                  <Tag data-size="sm" data-color="neutral">
                    {fields.length} {t('formBuilder.fieldsTitle')}
                  </Tag>
                </Stack>

                {fields.length === 0 ? (
                  <EmptyState
                    title={t('formBuilder.noFieldsYet')}
                    description={t('formBuilder.addFieldsHint')}
                    icon={<PlusIcon />}
                  />
                ) : (
                  fields.map((field, idx) => {
                    const isEditing = editingFieldId === field.id;
                    const fieldType = FIELD_TYPES.find((ft) => ft.id === field.type);
                    return (
                      <Card
                        key={field.id}
                        style={{
                          padding: 'var(--ds-size-3)',
                          border: isEditing
                            ? '2px solid var(--ds-color-brand-1-border-default)'
                            : '1px solid var(--ds-color-neutral-border-subtle)',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                          boxShadow: isEditing
                            ? '0 0 0 3px color-mix(in srgb, var(--ds-color-brand-1-base-default) 15%, transparent)'
                            : undefined,
                        }}
                        onClick={() => setEditingFieldId(isEditing ? null : field.id)}
                      >
                        <Stack direction="vertical" spacing="var(--ds-size-2)">
                          {/* Field Header */}
                          <Stack direction="horizontal" justify="between" align="center">
                            <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                              <MoreVerticalIcon
                                style={{
                                  cursor: 'grab',
                                  color: 'var(--ds-color-neutral-text-subtle)',
                                  width: '16px',
                                  height: '16px',
                                }}
                              />
                              <StatusTag color="neutral" size="sm">
                                {fieldType?.label || field.type}
                              </StatusTag>
                              <Paragraph data-size="sm" className={styles.fontBold}>
                                {field.label}
                              </Paragraph>
                              {field.required && (
                                <StatusTag color="danger" size="sm">
                                  {t('formBuilder.required')}
                                </StatusTag>
                              )}
                            </Stack>
                            <Stack direction="horizontal" spacing="var(--ds-size-1)">
                              {idx > 0 && (
                                <Button
                                  variant="tertiary"
                                  data-size="sm"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    moveField(idx, 'up');
                                  }}
                                  aria-label={t('formBuilder.moveUp')}
                                >
                                  ↑
                                </Button>
                              )}
                              {idx < fields.length - 1 && (
                                <Button
                                  variant="tertiary"
                                  data-size="sm"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    moveField(idx, 'down');
                                  }}
                                  aria-label={t('formBuilder.moveDown')}
                                >
                                  ↓
                                </Button>
                              )}
                              <Button
                                variant="tertiary"
                                data-size="sm"
                                data-color="danger"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  removeField(field.id);
                                }}
                                aria-label={t('formBuilder.removeField')}
                              >
                                <TrashIcon />
                              </Button>
                            </Stack>
                          </Stack>

                          {/* Inline Editor */}
                          {isEditing && (
                            <Card className={styles.editorCard}>
                              <Stack direction="vertical" spacing="var(--ds-size-3)">
                                <Grid columns="1fr 1fr" gap="var(--ds-size-3)">
                                  <Textfield
                                    label={t('formBuilder.fieldLabel')}
                                    value={field.label}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      updateField(field.id, { label: e.target.value })
                                    }
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  />
                                  <Textfield
                                    label={t('formBuilder.fieldPlaceholder')}
                                    value={field.placeholder || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      updateField(field.id, { placeholder: e.target.value })
                                    }
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  />
                                </Grid>
                                {field.options && (
                                  <Textfield
                                    label={t('formBuilder.optionsLabel')}
                                    value={field.options.join(', ')}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      updateField(field.id, {
                                        options: e.target.value
                                          .split(',')
                                          .map((s: string) => s.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    description={t('formBuilder.optionsSeparator')}
                                  />
                                )}
                                <Textfield
                                  label={t('formBuilder.helpText')}
                                  value={field.helpText || ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateField(field.id, { helpText: e.target.value })
                                  }
                                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                  placeholder={t('formBuilder.helpTextPlaceholder')}
                                />
                                <Stack direction="horizontal" spacing="var(--ds-size-2)" align="center">
                                  <Button
                                    variant={field.required ? 'primary' : 'secondary'}
                                    data-size="sm"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      updateField(field.id, { required: !field.required });
                                    }}
                                  >
                                    {field.required
                                      ? `✓ ${t('formBuilder.requiredToggle')}`
                                      : t('formBuilder.optionalToggle')}
                                  </Button>
                                </Stack>
                              </Stack>
                            </Card>
                          )}
                        </Stack>
                      </Card>
                    );
                  })
                )}
              </Stack>
            </Stack>
          </Stack>
        );

      // ═══════════════════ Step 3: Preview ═══════════════════
      case 'preview':
        return (
          <Stack direction="vertical" spacing="var(--ds-size-5)">
            <Stack direction="vertical" spacing="var(--ds-size-1)">
              <Heading level={2} data-size="sm">
                {t('formBuilder.previewTitle')}
              </Heading>
              <Paragraph data-size="sm" className={styles.subtleText}>
                {t('formBuilder.previewDescription')}
              </Paragraph>
            </Stack>

            {fields.length === 0 ? (
              <EmptyState
                icon={<EyeIcon />}
                title={t('formBuilder.noFieldsPreview')}
                description={t('formBuilder.noFieldsPreviewDesc')}
              />
            ) : (
              <Card className={styles.previewCard}>
                <Stack direction="vertical" spacing="var(--ds-size-4)">
                  <Stack direction="vertical" spacing="var(--ds-size-1)">
                    <Heading data-size="sm" className={styles.noMargin}>
                      {formName || t('formBuilder.untitled')}
                    </Heading>
                    {formDescription && (
                      <Paragraph data-size="sm" className={styles.subtleText}>
                        {formDescription}
                      </Paragraph>
                    )}
                  </Stack>
                  {fields.map((field) => {
                    if (field.type === 'divider') return <div key={field.id} className={styles.dividerPreview} />;
                    if (field.type === 'heading')
                      return (
                        <Heading key={field.id} data-size="2xs" className={styles.noMargin}>
                          {field.label}
                        </Heading>
                      );
                    if (field.type === 'paragraph')
                      return (
                        <Paragraph key={field.id} data-size="sm" className={styles.subtleText}>
                          {field.label}
                        </Paragraph>
                      );
                    if (field.type === 'richtext')
                      return (
                        <div key={field.id}>
                          <RichTextEditor
                            label={`${field.label}${field.required ? ' *' : ''}`}
                            value=""
                            onChange={() => {}}
                            placeholder={field.placeholder}
                            toolbar="minimal"
                            minHeight={120}
                            disabled
                          />
                        </div>
                      );
                    if (field.type === 'textarea')
                      return (
                        <Textarea
                          key={field.id}
                          aria-label={field.label}
                          placeholder={field.placeholder}
                          rows={3}
                          disabled
                        />
                      );
                    return (
                      <Textfield
                        key={field.id}
                        label={`${field.label}${field.required ? ' *' : ''}`}
                        placeholder={field.placeholder}
                        disabled
                        description={field.helpText}
                      />
                    );
                  })}
                  <Button data-size="sm" disabled style={{ alignSelf: 'flex-start' }}>
                    {t('formBuilder.submitButton')}
                  </Button>
                  {formSuccessMessage && (
                    <Card className={styles.successPreview}>
                      <Paragraph data-size="sm" className={styles.noMargin}>
                        {formSuccessMessage}
                      </Paragraph>
                    </Card>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
        );

      // ═══════════════════ Step 4: Review ═══════════════════
      case 'review':
        return (
          <Stack direction="vertical" spacing="var(--ds-size-5)">
            <Stack direction="vertical" spacing="var(--ds-size-1)">
              <Heading level={2} data-size="2xs">
                {t('formBuilder.reviewTitle')}
              </Heading>
              <Paragraph data-size="xs" className={styles.subtleText}>
                {t('formBuilder.reviewSubtitle')}
              </Paragraph>
            </Stack>

            {/* Summary table */}
            <Card className={styles.reviewCard}>
              <Stack direction="vertical" spacing="var(--ds-size-3)">
                <MetadataRow
                  label={t('formBuilder.reviewFormName')}
                  value={formName || t('formBuilder.notSet')}
                  size="sm"
                />
                <MetadataRow
                  label={t('formBuilder.reviewCategory')}
                  value={
                    categoryMeta[formCategory] ? (
                      <StatusTag color={categoryMeta[formCategory].statusColor} size="sm">
                        {categoryMeta[formCategory].label}
                      </StatusTag>
                    ) : (
                      formCategory
                    )
                  }
                  size="sm"
                />
                <MetadataRow
                  label={t('formBuilder.descriptionLabel')}
                  value={formDescription || t('formBuilder.none')}
                  size="sm"
                />
                <MetadataRow label={t('formBuilder.reviewFieldCount')} value={String(fields.length)} size="sm" />
                <MetadataRow
                  label={t('formBuilder.confirmationLabel')}
                  value={formSuccessMessage || t('formBuilder.defaultConfirmation')}
                  size="sm"
                />
              </Stack>
            </Card>

            {/* Field summary */}
            {fields.length > 0 && (
              <Card className={styles.reviewFieldsCard}>
                <Stack direction="vertical" spacing="var(--ds-size-2)">
                  <Heading data-size="2xs" className={styles.noMargin}>
                    {t('formBuilder.fieldsTitle')} ({fields.length})
                  </Heading>
                  {fields.map((field) => {
                    const fieldType = FIELD_TYPES.find((ft) => ft.id === field.type);
                    return (
                      <Stack key={field.id} direction="horizontal" spacing="var(--ds-size-2)" align="center">
                        <StatusTag color="neutral" size="sm">
                          {fieldType?.label || field.type}
                        </StatusTag>
                        <Paragraph data-size="sm" className={styles.noMargin}>
                          {field.label}
                        </Paragraph>
                        {field.required && (
                          <StatusTag color="danger" size="sm">
                            {t('formBuilder.required')}
                          </StatusTag>
                        )}
                      </Stack>
                    );
                  })}
                </Stack>
              </Card>
            )}
          </Stack>
        );

      default:
        return <Paragraph>{t('formBuilder.unknownStep')}</Paragraph>;
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
              {isEditMode ? t('formBuilder.editTitle') : t('formBuilder.createTitle')}
            </Heading>
            <Paragraph data-size="sm" className={styles.wizardSubtitle}>
              {isEditMode ? t('formBuilder.editSubtitle') : t('formBuilder.createSubtitle')}
            </Paragraph>
          </div>
        </div>

        {/* Save status toast */}
        {saveStatus !== 'idle' && (
          <div className={saveStatus === 'success' ? styles.saveSuccess : styles.saveError}>
            <span className={styles.saveIcon}>{saveStatus === 'success' ? '✓' : '✕'}</span>
            <Paragraph data-size="sm" className={styles.saveMessage}>
              {saveStatus === 'success' ? t('formBuilder.saveSuccess') : t('formBuilder.saveError')}
            </Paragraph>
          </div>
        )}

        {/* Wizard Stepper */}
        <div className={styles.stepper}>
          <PillTabs
            tabs={WIZARD_STEPS}
            activeTab={currentStepId}
            onTabChange={goToStep}
            variant="wizard"
            fullWidth={true}
            ariaLabel={t('formBuilder.wizardSteps')}
          />
        </div>

        {/* Step Content */}
        <div className={styles.content}>{renderStep()}</div>

        {/* Footer */}
        <div className={styles.wizardFooter}>
          <div className={styles.footerLeft}>
            {canGoPrev && (
              <Button variant="secondary" onClick={prevStep}>
                ← {t('formBuilder.previous')}
              </Button>
            )}
          </div>
          <div className={styles.footerCenter}>
            <Button variant="secondary" onClick={handleSave} disabled={isSaving || !formName.trim()}>
              {isSaving ? t('formBuilder.saving') : t('formBuilder.save')}
            </Button>
            <Button variant="tertiary" onClick={handleCancel}>
              {t('formBuilder.cancel')}
            </Button>
          </div>
          <div className={styles.footerRight}>
            {isLastStep ? (
              <Button variant="primary" onClick={handleSave} disabled={isSaving || !formName.trim()}>
                <CheckCircleIcon />
                {isSaving ? t('formBuilder.publishing') : t('formBuilder.publish')}
              </Button>
            ) : (
              <Button variant="primary" onClick={nextStep} disabled={!canGoNext}>
                {t('formBuilder.next')} →
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContentLayout>
  );
}
