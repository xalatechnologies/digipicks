/**
 * CrudFormPage
 *
 * Standard layout for CRUD create/edit pages. Renders a DashboardPageHeader
 * with back navigation, a title, optional subtitle, header actions (save/cancel),
 * and the form content inside PageContentLayout.
 *
 * @example
 * <CrudFormPage
 *   title="Edit Tenant"
 *   subtitle="Update tenant configuration"
 *   backHref="/tenants"
 *   backLabel="Back to tenants"
 *   headerActions={
 *     <>
 *       <Button variant="secondary" onClick={onCancel}>Cancel</Button>
 *       <Button variant="primary" onClick={onSave}>Save</Button>
 *     </>
 *   }
 *   onSubmit={handleSubmit}
 * >
 *   <FormSection title="General">
 *     <Textfield label="Name" value={name} onChange={setName} />
 *   </FormSection>
 * </CrudFormPage>
 */

import { cn } from '../../utils';
import { PageContentLayout } from '../layout/PageContentLayout';
import { DashboardPageHeader } from '../navigation/DashboardPageHeader';
import styles from './CrudFormPage.module.css';

export interface CrudFormPageProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Back navigation href */
  backHref?: string;
  /** Aria label for back button */
  backLabel?: string;
  /** Header action buttons (save, cancel, etc.) — rendered on the right */
  headerActions?: React.ReactNode;
  /** Breadcrumb navigation */
  breadcrumb?: React.ReactNode;
  /** Form content */
  children: React.ReactNode;
  /** Called on form submit (wraps children in <form>) */
  onSubmit?: (e: React.FormEvent) => void;
  /** Loading state — disables form submission */
  isSubmitting?: boolean;
  /** Additional class name for the page */
  className?: string;
  /** Gap between form sections @default 'lg' */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Max width for the form content area */
  maxWidth?: string;
}

export function CrudFormPage({
  title,
  subtitle,
  backHref,
  backLabel,
  headerActions,
  breadcrumb,
  children,
  onSubmit,
  isSubmitting = false,
  className,
  gap = 'lg',
  maxWidth,
}: CrudFormPageProps): React.ReactElement {
  const content = (
    <div
      className={cn(styles.formContent, className)}
      style={maxWidth ? { maxWidth } : undefined}
    >
      {children}
    </div>
  );

  return (
    <PageContentLayout gap={gap}>
      <DashboardPageHeader
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
        breadcrumb={breadcrumb}
        actions={headerActions}
        sticky
      />
      {onSubmit ? (
        <form onSubmit={onSubmit} className={styles.form}>
          <fieldset disabled={isSubmitting} className={styles.fieldset}>
            {content}
          </fieldset>
        </form>
      ) : (
        content
      )}
    </PageContentLayout>
  );
}

CrudFormPage.displayName = 'CrudFormPage';
