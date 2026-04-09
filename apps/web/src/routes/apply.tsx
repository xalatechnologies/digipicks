/**
 * Creator Application Page — /apply
 *
 * Public web route where users apply to become creators on DigiPicks.
 * Shows application form for new applicants, status card for existing ones,
 * and resubmission form when more info is requested.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Button,
    Heading,
    Paragraph,
    Card,
    Textfield,
    Textarea,
    NativeSelect,
    Spinner,
    Alert,
    Stack,
} from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';
import { useAuth, env } from '@digilist-saas/app-shell';
import {
    useMyCreatorApplication,
    useSubmitCreatorApplication,
    useResubmitCreatorApplication,
} from '@digilist-saas/sdk';
import type { Id } from '@digilist-saas/sdk';
import styles from './apply.module.css';

// =============================================================================
// Constants
// =============================================================================

const NICHE_OPTIONS = [
    { value: '', label: '' },
    { value: 'NFL', label: 'NFL' },
    { value: 'NBA', label: 'NBA' },
    { value: 'MLB', label: 'MLB' },
    { value: 'NHL', label: 'NHL' },
    { value: 'Soccer', label: 'Soccer' },
    { value: 'MMA', label: 'MMA' },
    { value: 'Tennis', label: 'Tennis' },
    { value: 'Golf', label: 'Golf' },
    { value: 'Esports', label: 'Esports' },
    { value: 'Other', label: 'Other' },
];

// =============================================================================
// Component
// =============================================================================

export function ApplyPage() {
    const t = useT();
    const navigate = useNavigate();
    const auth = useAuth();
    const tenantId = env.tenantId as string | undefined;

    // Fetch existing application
    const { application, isLoading: appLoading } = useMyCreatorApplication(
        tenantId as Id<"tenants"> | undefined,
        auth.user?.id as Id<"users"> | undefined
    );

    // Mutations
    const submitMutation = useSubmitCreatorApplication();
    const resubmitMutation = useResubmitCreatorApplication();

    // Form state
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [niche, setNiche] = useState('');
    const [specialties, setSpecialties] = useState('');
    const [performanceProof, setPerformanceProof] = useState('');
    const [trackRecordUrl, setTrackRecordUrl] = useState('');
    const [twitter, setTwitter] = useState('');
    const [instagram, setInstagram] = useState('');
    const [youtube, setYoutube] = useState('');
    const [discord, setDiscord] = useState('');
    const [website, setWebsite] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!tenantId || !auth.user?.id) return;

        if (!displayName.trim()) {
            setError(t('apply.errors.nameRequired', 'Display name is required'));
            return;
        }
        if (!bio.trim()) {
            setError(t('apply.errors.bioRequired', 'Bio is required'));
            return;
        }
        if (!niche) {
            setError(t('apply.errors.nicheRequired', 'Please select a sport/niche'));
            return;
        }

        setIsSubmitting(true);

        const socialLinks: Record<string, string> = {};
        if (twitter.trim()) socialLinks.twitter = twitter.trim();
        if (instagram.trim()) socialLinks.instagram = instagram.trim();
        if (youtube.trim()) socialLinks.youtube = youtube.trim();
        if (discord.trim()) socialLinks.discord = discord.trim();
        if (website.trim()) socialLinks.website = website.trim();

        const hasSocial = Object.keys(socialLinks).length > 0;
        const specialtiesArray = specialties
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        try {
            await submitMutation.mutateAsync({
                tenantId: tenantId as Id<"tenants">,
                userId: auth.user.id as Id<"users">,
                displayName: displayName.trim(),
                bio: bio.trim(),
                niche,
                specialties: specialtiesArray.length > 0 ? specialtiesArray : undefined,
                performanceProof: performanceProof.trim() || undefined,
                trackRecordUrl: trackRecordUrl.trim() || undefined,
                socialLinks: hasSocial ? socialLinks : undefined,
            });
            setSuccess(true);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t('apply.errors.submitFailed', 'Failed to submit application. Please try again.')
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [
        tenantId, auth.user?.id, displayName, bio, niche, specialties,
        performanceProof, trackRecordUrl, twitter, instagram, youtube,
        discord, website, submitMutation, t,
    ]);

    const handleResubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!tenantId || !auth.user?.id || !application) return;

        setIsSubmitting(true);

        const socialLinks: Record<string, string> = {};
        if (twitter.trim()) socialLinks.twitter = twitter.trim();
        if (instagram.trim()) socialLinks.instagram = instagram.trim();
        if (youtube.trim()) socialLinks.youtube = youtube.trim();
        if (discord.trim()) socialLinks.discord = discord.trim();
        if (website.trim()) socialLinks.website = website.trim();

        const hasSocial = Object.keys(socialLinks).length > 0;
        const specialtiesArray = specialties
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        try {
            await resubmitMutation.mutateAsync({
                tenantId: tenantId as Id<"tenants">,
                id: application.id,
                userId: auth.user.id as Id<"users">,
                displayName: displayName.trim() || undefined,
                bio: bio.trim() || undefined,
                niche: niche || undefined,
                specialties: specialtiesArray.length > 0 ? specialtiesArray : undefined,
                performanceProof: performanceProof.trim() || undefined,
                trackRecordUrl: trackRecordUrl.trim() || undefined,
                socialLinks: hasSocial ? socialLinks : undefined,
            });
            setSuccess(true);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t('apply.errors.resubmitFailed', 'Failed to resubmit application. Please try again.')
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [
        tenantId, auth.user?.id, application, displayName, bio, niche,
        specialties, performanceProof, trackRecordUrl, twitter, instagram,
        youtube, discord, website, resubmitMutation, t,
    ]);

    // Not logged in
    if (!auth.isAuthenticated) {
        return (
            <div className={styles.applyPage}>
                <div className={styles.loginPrompt}>
                    <Heading level={2} data-size="md">
                        {t('apply.loginRequired', 'Sign in to apply')}
                    </Heading>
                    <Paragraph data-size="md" style={{ marginTop: 'var(--ds-size-3)' }}>
                        {t('apply.loginDescription', 'You need an account to apply as a creator on DigiPicks.')}
                    </Paragraph>
                    <Stack direction="horizontal" spacing="var(--ds-size-3)" style={{ justifyContent: 'center', marginTop: 'var(--ds-size-4)' }}>
                        <Button onClick={() => navigate('/login')}>
                            {t('common.login', 'Sign in')}
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/register')}>
                            {t('common.register', 'Create account')}
                        </Button>
                    </Stack>
                </div>
            </div>
        );
    }

    // Loading existing application
    if (appLoading) {
        return (
            <div className={styles.applyPage}>
                <div className={styles.loadingWrap}>
                    <Spinner aria-label={t('common.loading', 'Loading...')} />
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className={styles.applyPage}>
                <Card className={styles.statusCard}>
                    <Heading level={2} data-size="md">
                        {t('apply.submitted', 'Application submitted!')}
                    </Heading>
                    <Paragraph data-size="md" style={{ marginTop: 'var(--ds-size-3)' }}>
                        {t('apply.submittedDescription', 'We\'ll review your application and get back to you soon. Check back here for updates.')}
                    </Paragraph>
                    <Button
                        variant="secondary"
                        onClick={() => navigate('/')}
                        style={{ marginTop: 'var(--ds-size-4)' }}
                    >
                        {t('apply.backToHome', 'Back to home')}
                    </Button>
                </Card>
            </div>
        );
    }

    // Existing application — show status
    if (application && application.status !== 'more_info_requested' && application.status !== 'rejected') {
        const statusClass =
            application.status === 'pending' ? styles.statusPending
            : application.status === 'approved' ? styles.statusApproved
            : styles.statusRejected;

        const statusLabel =
            application.status === 'pending'
                ? t('apply.status.pending', 'Under review')
                : application.status === 'approved'
                ? t('apply.status.approved', 'Approved')
                : t('apply.status.rejected', 'Rejected');

        return (
            <div className={styles.applyPage}>
                <Card className={styles.statusCard}>
                    <Heading level={2} data-size="md">
                        {t('apply.existingTitle', 'Your application')}
                    </Heading>
                    <div style={{ marginTop: 'var(--ds-size-4)' }}>
                        <span className={`${styles.statusBadge} ${statusClass}`}>
                            {statusLabel}
                        </span>
                    </div>
                    <Paragraph data-size="sm" style={{ marginTop: 'var(--ds-size-3)', color: 'var(--ds-color-neutral-text-subtle)' }}>
                        {t('apply.submittedOn', 'Submitted')} {new Date(application.submittedAt).toLocaleDateString()}
                    </Paragraph>
                    {application.status === 'approved' && (
                        <Paragraph data-size="md" style={{ marginTop: 'var(--ds-size-3)' }}>
                            {t('apply.approvedMessage', 'Congratulations! You\'re now a verified creator. Head to your dashboard to start posting picks.')}
                        </Paragraph>
                    )}
                </Card>
            </div>
        );
    }

    // Show resubmission form if more_info_requested or rejected
    const isResubmission = application && (application.status === 'more_info_requested' || application.status === 'rejected');

    return (
        <div className={styles.applyPage}>
            <Heading level={1} data-size="lg">
                {isResubmission
                    ? t('apply.resubmitTitle', 'Update your application')
                    : t('apply.title', 'Apply to become a creator')
                }
            </Heading>
            <Paragraph data-size="md" style={{ marginTop: 'var(--ds-size-2)' }}>
                {isResubmission
                    ? t('apply.resubmitDescription', 'Update the fields below and resubmit your application for review.')
                    : t('apply.description', 'Share your expertise with sports bettors. Fill out the form below and we\'ll review your application.')
                }
            </Paragraph>

            {isResubmission && application?.reviewNote && (
                <Alert severity="info" style={{ marginTop: 'var(--ds-size-4)' }}>
                    <Heading level={3} data-size="2xs">
                        {t('apply.reviewFeedback', 'Reviewer feedback')}
                    </Heading>
                    <Paragraph data-size="sm">{application.reviewNote}</Paragraph>
                </Alert>
            )}

            {error && (
                <Alert severity="danger" style={{ marginTop: 'var(--ds-size-4)' }}>
                    {error}
                </Alert>
            )}

            <Card className={styles.formCard} style={{ marginTop: 'var(--ds-size-5)' }}>
                <form onSubmit={isResubmission ? handleResubmit : handleSubmit}>
                    <Stack direction="vertical" spacing="var(--ds-size-4)">
                        {/* Identity */}
                        <Heading level={3} data-size="xs">
                            {t('apply.section.identity', 'About you')}
                        </Heading>

                        <Textfield
                            label={t('apply.displayName', 'Display name')}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={isResubmission ? application?.displayName : undefined}
                            required={!isResubmission}
                        />

                        <Textarea
                            label={t('apply.bio', 'Bio')}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder={isResubmission
                                ? application?.bio
                                : t('apply.bioPlaceholder', 'Tell subscribers about yourself and your betting approach...')
                            }
                            rows={4}
                            required={!isResubmission}
                        />

                        {/* Niche & expertise */}
                        <Heading level={3} data-size="xs" className={styles.sectionHeading}>
                            {t('apply.section.expertise', 'Your expertise')}
                        </Heading>

                        <NativeSelect
                            label={t('apply.niche', 'Primary sport / niche')}
                            value={niche}
                            onChange={(e) => setNiche(e.target.value)}
                            required={!isResubmission}
                        >
                            {NICHE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label || t('apply.selectNiche', '-- Select --')}
                                </option>
                            ))}
                        </NativeSelect>

                        <Textfield
                            label={t('apply.specialties', 'Specialties')}
                            value={specialties}
                            onChange={(e) => setSpecialties(e.target.value)}
                            placeholder={t('apply.specialtiesPlaceholder', 'e.g. props, parlays, live betting (comma-separated)')}
                        />

                        {/* Performance */}
                        <Heading level={3} data-size="xs" className={styles.sectionHeading}>
                            {t('apply.section.performance', 'Track record')}
                        </Heading>

                        <Textarea
                            label={t('apply.performanceProof', 'Performance proof')}
                            value={performanceProof}
                            onChange={(e) => setPerformanceProof(e.target.value)}
                            placeholder={t('apply.performanceProofPlaceholder', 'Describe your betting track record, win rates, ROI, etc.')}
                            rows={3}
                        />

                        <Textfield
                            label={t('apply.trackRecordUrl', 'Tracker profile URL')}
                            value={trackRecordUrl}
                            onChange={(e) => setTrackRecordUrl(e.target.value)}
                            placeholder={t('apply.trackRecordUrlPlaceholder', 'Link to your verified track record')}
                        />

                        {/* Social links */}
                        <Heading level={3} data-size="xs" className={styles.sectionHeading}>
                            {t('apply.section.social', 'Social presence')}
                        </Heading>

                        <div className={styles.socialGrid}>
                            <Textfield
                                label="Twitter / X"
                                value={twitter}
                                onChange={(e) => setTwitter(e.target.value)}
                                placeholder="@handle"
                            />
                            <Textfield
                                label="Instagram"
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                placeholder="@handle"
                            />
                            <Textfield
                                label="YouTube"
                                value={youtube}
                                onChange={(e) => setYoutube(e.target.value)}
                                placeholder={t('apply.youtubeChannel', 'Channel URL')}
                            />
                            <Textfield
                                label="Discord"
                                value={discord}
                                onChange={(e) => setDiscord(e.target.value)}
                                placeholder={t('apply.discordServer', 'Server invite')}
                            />
                        </div>

                        <Textfield
                            label={t('apply.website', 'Website')}
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            placeholder="https://"
                            className={styles.fullWidth}
                        />

                        {/* Submit */}
                        <div className={styles.submitRow}>
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={() => navigate(-1)}
                            >
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                loading={isSubmitting}
                                disabled={isSubmitting}
                            >
                                {isResubmission
                                    ? t('apply.resubmit', 'Resubmit application')
                                    : t('apply.submit', 'Submit application')
                                }
                            </Button>
                        </div>
                    </Stack>
                </form>
            </Card>
        </div>
    );
}
