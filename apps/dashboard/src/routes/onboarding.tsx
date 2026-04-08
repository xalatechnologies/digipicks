/**
 * Tenant Onboarding Page — Dashboard
 *
 * 4-step wizard for new owners to create their organization/tenant.
 * Step 0: Account type (Privatperson vs Foretak/Organisation)
 * Step 1: Org name + slug (live availability check)
 * Step 2: Contact info + plan selection
 * Step 3: Confirmation + create
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    Textfield,
    Heading,
    Paragraph,
    Alert,
    NativeSelect,
    Stack,
    Card,
    PageContentLayout,
    DashboardPageHeader,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useAuthBridge } from '@digilist-saas/app-shell';
import {
    useCreateTenant,
    useCheckSlugAvailable,
} from '@digilist-saas/sdk';
import { useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import styles from './onboarding.module.css';

// =============================================================================
// Component
// =============================================================================

export function OnboardingPage() {
    const t = useT();
    const navigate = useNavigate();
    const { user } = useAuthBridge();

    // Wizard step
    const [step, setStep] = useState(0);

    // Account type (Step 0)
    const [accountType, setAccountType] = useState<'private' | 'organization'>('private');
    const [orgNumber, setOrgNumber] = useState('');
    const [orgVerifyResult, setOrgVerifyResult] = useState<{ valid: boolean; name: string | null } | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const verifyOrg = useAction(api.domain.organizationVerify.verify);

    // Form data
    const [orgName, setOrgName] = useState('');
    const [slug, setSlug] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [plan, setPlan] = useState('starter');

    // State
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-generate slug from org name
    useEffect(() => {
        const generated = orgName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9æøå\s-]/g, '')
            .replace(/[æ]/g, 'ae')
            .replace(/[ø]/g, 'o')
            .replace(/[å]/g, 'a')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        setSlug(generated);
    }, [orgName]);

    // Pre-fill email from user
    useEffect(() => {
        if (user?.email && !contactEmail) {
            setContactEmail(user.email);
        }
    }, [user?.email, contactEmail]);

    // Slug availability
    const [debouncedSlug, setDebouncedSlug] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSlug(slug), 400);
        return () => clearTimeout(timer);
    }, [slug]);

    const slugCheck = useCheckSlugAvailable(debouncedSlug || undefined);

    // Create mutation
    const createTenantMutation = useCreateTenant();

    const handleCreate = useCallback(async () => {
        if (!user?.id) return;
        setError(null);
        setIsSubmitting(true);

        try {
            const result = await createTenantMutation.mutateAsync({
                userId: user.id as Id<"users">,
                name: orgName,
                slug,
                contactEmail: contactEmail || undefined,
                contactPhone: contactPhone || undefined,
                plan,
                enabledCategories: ['ALLE', 'LOKALER', 'ARRANGEMENTER'],
            });

            if (result && (result as any).success) {
                navigate('/', { replace: true });
            } else {
                setError((result as any)?.error || t('onboarding.createFailed', 'Kunne ikke opprette organisasjonen.'));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('common.error', 'Feil'));
        } finally {
            setIsSubmitting(false);
        }
    }, [user?.id, orgName, slug, contactEmail, contactPhone, plan, createTenantMutation, navigate, t]);

    const canProceedStep0 = accountType === 'private' || (accountType === 'organization' && orgVerifyResult?.valid === true);
    const canProceedStep1 = orgName.trim().length >= 2 && slug.length >= 2 && slugCheck.data?.available === true;
    const canProceedStep2 = true; // Contact info is optional

    const handleVerifyOrg = async () => {
        if (!orgNumber.trim()) return;
        setIsVerifying(true);
        setOrgVerifyResult(null);
        try {
            const result = await verifyOrg({ orgNumber: orgNumber.replace(/\s/g, '') });
            setOrgVerifyResult(result);
            // Auto-fill org name if verified
            if (result.valid && result.name && !orgName) {
                setOrgName(result.name);
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const steps = [
        t('onboarding.stepAccountType', 'Kontotype'),
        t('onboarding.stepOrg', 'Organisasjon'),
        t('onboarding.stepContact', 'Kontakt'),
        t('onboarding.stepConfirm', 'Bekreft'),
    ];

    return (
        <PageContentLayout>
            <DashboardPageHeader
                title={t('onboarding.title', 'Opprett organisasjon')}
                subtitle={t('onboarding.subtitle', 'Sett opp din organisasjon for å komme i gang.')}
            />

            {/* Step indicator */}
            <Stack direction="horizontal" spacing="var(--ds-size-4)" style={{ marginBottom: 'var(--ds-size-6)' }}>
                {steps.map((label, i) => (
                    <Paragraph
                        key={i}
                        data-size="sm"
                        style={{
                            fontWeight: i === step ? 600 : 400,
                            color: i === step
                                ? 'var(--ds-color-accent-text-default)'
                                : 'var(--ds-color-neutral-text-subtle)',
                        }}
                    >
                        {i + 1}. {label}
                    </Paragraph>
                ))}
            </Stack>

            <Card style={{ padding: 'var(--ds-size-6)', maxWidth: '560px' }}>
                {/* Step 0: Account Type */}
                {step === 0 && (
                    <Stack direction="vertical" spacing="var(--ds-size-4)">
                        <Heading level={3} data-size="xs">
                            {t('onboarding.accountTypeTitle', 'Hva slags konto ønsker du?')}
                        </Heading>

                        <div className={styles.accountTypeGrid}>
                            <Button
                                type="button"
                                variant={accountType === 'private' ? 'primary' : 'secondary'}
                                onClick={() => { setAccountType('private'); setOrgVerifyResult(null); }}
                                className={styles.accountTypeButton}
                            >
                                <Paragraph data-size="sm" style={{ fontWeight: 600 }}>
                                    {t('onboarding.privateAccount', 'Privatperson')}
                                </Paragraph>
                                <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)', marginTop: '4px' }}>
                                    {t('onboarding.privateDesc', 'Verifisert med BankID')}
                                </Paragraph>
                            </Button>
                            <Button
                                type="button"
                                variant={accountType === 'organization' ? 'primary' : 'secondary'}
                                onClick={() => setAccountType('organization')}
                                className={styles.accountTypeButton}
                            >
                                <Paragraph data-size="sm" style={{ fontWeight: 600 }}>
                                    {t('onboarding.orgAccount', 'Foretak / Organisasjon')}
                                </Paragraph>
                                <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)', marginTop: '4px' }}>
                                    {t('onboarding.orgDesc', 'Kobles til organisasjonsnummer')}
                                </Paragraph>
                            </Button>
                        </div>

                        {accountType === 'organization' && (
                            <Stack direction="vertical" spacing="var(--ds-size-3)">
                                <Stack direction="horizontal" spacing="var(--ds-size-2)" align="end">
                                    <Textfield
                                        label={t('onboarding.orgNumber', 'Organisasjonsnummer')}
                                        value={orgNumber}
                                        onChange={(e) => { setOrgNumber(e.target.value); setOrgVerifyResult(null); }}
                                        placeholder="123 456 789"
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        variant="secondary"
                                        data-size="sm"
                                        onClick={handleVerifyOrg}
                                        loading={isVerifying}
                                        disabled={orgNumber.replace(/\s/g, '').length < 9}
                                    >
                                        {t('onboarding.verify', 'Verifiser')}
                                    </Button>
                                </Stack>
                                {orgVerifyResult && (
                                    <Alert data-color={orgVerifyResult.valid ? 'success' : 'danger'}>
                                        {orgVerifyResult.valid
                                            ? `✓ ${orgVerifyResult.name}`
                                            : t('onboarding.orgNotFound', 'Organisasjonsnummer ikke funnet i Brønnøysundregistrene')}
                                    </Alert>
                                )}
                            </Stack>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="primary" onClick={() => setStep(1)} disabled={!canProceedStep0}>
                                {t('common.next', 'Neste')} →
                            </Button>
                        </div>
                    </Stack>
                )}

                {/* Step 1: Organization */}
                {step === 1 && (
                    <Stack direction="vertical" spacing="var(--ds-size-4)">
                        <Textfield
                            label={t('onboarding.orgName', 'Organisasjonsnavn')}
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            autoFocus
                        />

                        <div>
                            <Textfield
                                label={t('onboarding.slug', 'URL-navn')}
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                aria-describedby="slug-status"
                            />
                            {debouncedSlug.length >= 2 && slugCheck.data && (
                                <Paragraph
                                    id="slug-status"
                                    data-size="xs"
                                    style={{
                                        marginTop: '4px',
                                        color: slugCheck.data.available
                                            ? 'var(--ds-color-success-text-default)'
                                            : 'var(--ds-color-danger-text-default)',
                                    }}
                                >
                                    {slugCheck.data.available
                                        ? `✓ ${t('onboarding.slugAvailable', 'Tilgjengelig')}`
                                        : `✗ ${t('onboarding.slugTaken', 'Allerede i bruk')}`
                                    }
                                </Paragraph>
                            )}
                        </div>

                        <Stack direction="horizontal" spacing="var(--ds-size-3)" style={{ justifyContent: 'space-between' }}>
                            <Button variant="secondary" onClick={() => setStep(0)}>
                                ← {t('common.back', 'Tilbake')}
                            </Button>
                            <Button variant="primary" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                                {t('common.next', 'Neste')} →
                            </Button>
                        </Stack>
                    </Stack>
                )}

                {/* Step 2: Contact */}
                {step === 2 && (
                    <Stack direction="vertical" spacing="var(--ds-size-4)">
                        <Textfield
                            label={t('onboarding.contactEmail', 'Kontakt e-post')}
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                        />

                        <Textfield
                            label={t('onboarding.contactPhone', 'Telefonnummer')}
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                        />

                        <div>
                            <Paragraph data-size="sm" style={{ marginBottom: 'var(--ds-size-1)', fontWeight: 500 }}>
                                {t('onboarding.plan', 'Plan')}
                            </Paragraph>
                            <NativeSelect
                                value={plan}
                                onChange={(e) => setPlan(e.target.value)}
                            >
                                <option value="starter">Starter</option>
                                <option value="professional">Professional</option>
                                <option value="enterprise">Enterprise</option>
                            </NativeSelect>
                        </div>

                        <Stack direction="horizontal" spacing="var(--ds-size-3)" style={{ justifyContent: 'space-between' }}>
                            <Button variant="secondary" onClick={() => setStep(1)}>
                                ← {t('common.back', 'Tilbake')}
                            </Button>
                            <Button variant="primary" onClick={() => setStep(3)} disabled={!canProceedStep2}>
                                {t('common.next', 'Neste')} →
                            </Button>
                        </Stack>
                    </Stack>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                    <Stack direction="vertical" spacing="var(--ds-size-4)">
                        <Heading level={3} data-size="xs">
                            {t('onboarding.confirmTitle', 'Bekreft organisasjon')}
                        </Heading>

                        <div style={{ background: 'var(--ds-color-neutral-background-subtle)', padding: 'var(--ds-size-4)', borderRadius: 'var(--ds-border-radius-md)' }}>
                            <Paragraph data-size="sm">{`${t('onboarding.accountType', 'Kontotype')}: ${accountType === 'private' ? 'Privatperson' : 'Foretak / Organisasjon'}`}</Paragraph>
                            {accountType === 'organization' && orgNumber && (
                                <Paragraph data-size="sm">{`${t('onboarding.orgNumber', 'Org.nr')}: ${orgNumber}${orgVerifyResult?.name ? ` (${orgVerifyResult.name})` : ''}`}</Paragraph>
                            )}
                            <Paragraph data-size="sm">{`${t('onboarding.orgName', 'Organisasjonsnavn')}: ${orgName}`}</Paragraph>
                            <Paragraph data-size="sm">{`${t('onboarding.slug', 'URL-navn')}: ${slug}`}</Paragraph>
                            {contactEmail && <Paragraph data-size="sm">{`${t('onboarding.contactEmail', 'Kontakt e-post')}: ${contactEmail}`}</Paragraph>}
                            {contactPhone && <Paragraph data-size="sm">{`${t('onboarding.contactPhone', 'Telefonnummer')}: ${contactPhone}`}</Paragraph>}
                            <Paragraph data-size="sm">{`${t('onboarding.plan', 'Plan')}: ${plan}`}</Paragraph>
                        </div>

                        {error && (
                            <Alert data-color="danger">{error}</Alert>
                        )}

                        <Stack direction="horizontal" spacing="var(--ds-size-3)" style={{ justifyContent: 'space-between' }}>
                            <Button variant="secondary" onClick={() => setStep(2)}>
                                ← {t('common.back', 'Tilbake')}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleCreate}
                                disabled={isSubmitting}
                                loading={isSubmitting}
                            >
                                {t('onboarding.create', 'Opprett')}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Card>
        </PageContentLayout>
    );
}
