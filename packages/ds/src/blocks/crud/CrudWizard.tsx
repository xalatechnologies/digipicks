/**
 * CrudWizard
 *
 * Reusable multi-step wizard for CRUD create/edit pages.
 * Composes PillTabs (variant="wizard"), step content rendering,
 * and a footer with Back / Next / Save navigation.
 *
 * Pattern: identical to backoffice listing-wizard and integration-edit.
 *
 * @example
 * <CrudWizard
 *   title="Edit Tenant"
 *   subtitle="Update tenant configuration"
 *   backHref="/tenants"
 *   steps={[
 *     { id: 'general', label: 'General' },
 *     { id: 'plan', label: 'Plan' },
 *     { id: 'review', label: 'Review' },
 *   ]}
 *   currentStep="general"
 *   onStepChange={setStep}
 *   onSave={handleSave}
 *   isSaving={false}
 *   canSave={true}
 *   saveLabel="Save"
 *   cancelLabel="Cancel"
 *   onCancel={() => navigate('/tenants')}
 * >
 *   {(step) => {
 *     if (step === 'general') return <GeneralForm />;
 *     if (step === 'plan') return <PlanForm />;
 *     if (step === 'review') return <ReviewStep />;
 *     return null;
 *   }}
 * </CrudWizard>
 */

import * as React from 'react';
import { Button } from '@digdir/designsystemet-react';
import { PageContentLayout } from '../layout/PageContentLayout';
import { DashboardPageHeader } from '../navigation/DashboardPageHeader';
import { PillTabs } from '../../composed/PillTabs';
import type { PillTab } from '../../composed/PillTabs';
import styles from './CrudWizard.module.css';

// =============================================================================
// Types
// =============================================================================

export interface CrudWizardStep {
  /** Unique step identifier */
  id: string;
  /** Display label */
  label: string;
  /** Whether this step is disabled (not yet reachable) */
  disabled?: boolean;
}

export interface CrudWizardProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Back navigation href (arrow button) */
  backHref?: string;
  /** Aria label for back button */
  backLabel?: string;
  /** Header action buttons (rendered on the right of the header) */
  headerActions?: React.ReactNode;

  /** Wizard step definitions */
  steps: CrudWizardStep[];
  /** Currently active step id */
  currentStep: string;
  /** Called when user clicks a step tab */
  onStepChange: (stepId: string) => void;

  /** Render function — receives current step id, returns step content */
  children: (currentStep: string) => React.ReactNode;

  /** Called when user clicks Save/Publish on the last step */
  onSave: () => void;
  /** Whether a save is in progress */
  isSaving?: boolean;
  /** Whether the form is valid and can be saved */
  canSave?: boolean;
  /** Label for the save button @default 'Save' */
  saveLabel?: string;
  /** Label for the saving state @default 'Saving...' */
  savingLabel?: string;

  /** Label for the back/previous button @default 'Back' */
  backStepLabel?: string;
  /** Label for the next button @default 'Next' */
  nextLabel?: string;
  /** Label for the cancel button @default 'Cancel' */
  cancelLabel?: string;
  /** Called when user clicks Cancel */
  onCancel?: () => void;
  /** Whether to show the cancel button in the footer @default true */
  showCancel?: boolean;

  /** Use compact mode on mobile (hides step labels) */
  compact?: boolean;
  /** Max width for the step content area */
  maxWidth?: string;
  /** Additional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function CrudWizard({
  title,
  subtitle,
  backHref,
  backLabel,
  headerActions,
  steps,
  currentStep,
  onStepChange,
  children,
  onSave,
  isSaving = false,
  canSave = true,
  saveLabel = 'Save',
  savingLabel = 'Saving...',
  backStepLabel = 'Back',
  nextLabel = 'Next',
  cancelLabel = 'Cancel',
  onCancel,
  showCancel = true,
  compact = false,
  maxWidth,
  className,
}: CrudWizardProps): React.ReactElement {
  const stepIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirstStep = stepIndex <= 0;
  const isLastStep = stepIndex >= steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      onStepChange(steps[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange(steps[stepIndex - 1].id);
    }
  };

  // Map to PillTab format
  const pillTabs: PillTab[] = steps.map((step) => ({
    id: step.id,
    label: step.label,
    disabled: step.disabled,
  }));

  return (
    <PageContentLayout gap="lg" className={className}>
      <DashboardPageHeader
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
        actions={headerActions}
        sticky
      />

      {/* Wizard stepper */}
      <div className={styles.stepperCard}>
        <PillTabs
          tabs={pillTabs}
          activeTab={currentStep}
          onTabChange={onStepChange}
          variant="wizard"
          compact={compact}
          className={styles.stepperScroll}
          ariaLabel="Wizard steps"
        />
      </div>

      {/* Step content */}
      <div
        className={styles.stepContent}
        style={maxWidth ? { maxWidth } : undefined}
      >
        {children(currentStep)}
      </div>

      {/* Footer navigation */}
      <div className={styles.footer}>
        <div className={styles.footerStart}>
          <Button
            type="button"
            variant="secondary"
            data-size="md"
            onClick={handleBack}
            disabled={isFirstStep}
            className={styles.navButton}
          >
            {backStepLabel}
          </Button>
        </div>
        <div className={styles.footerEnd}>
          {showCancel && onCancel && (
            <Button
              type="button"
              variant="secondary"
              data-size="md"
              onClick={onCancel}
              className={styles.navButton}
            >
              {cancelLabel}
            </Button>
          )}
          {isLastStep ? (
            <Button
              type="button"
              variant="primary"
              data-size="md"
              onClick={onSave}
              disabled={isSaving || !canSave}
              className={styles.navButton}
            >
              {isSaving ? savingLabel : saveLabel}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              data-size="md"
              onClick={handleNext}
              className={styles.navButton}
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </PageContentLayout>
  );
}

CrudWizard.displayName = 'CrudWizard';
