/**
 * Creator Application Page — Web App
 *
 * Public-facing form for prospective creators to apply for verification.
 * Auto-saves a draft on every successful field group save; submits the
 * application for admin review when the user clicks "Submit application".
 *
 * Status badge shows where the application currently sits in the workflow.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Heading,
  Paragraph,
  Card,
  Stack,
  Textfield,
  Textarea,
  Button,
  Alert,
  Tag,
  Checkbox,
  Spinner,
} from '@digipicks/ds';
import { useAuth } from '@digipicks/app-shell';
import { useT } from '@digipicks/i18n';
import {
  useMyCreatorApplication,
  useUpsertCreatorDraft,
  useSubmitCreatorApplication,
  type CreatorApplicationStatus,
  type CreatorApplicationLink,
} from '@digipicks/sdk';

const STATUS_TONE: Record<
  CreatorApplicationStatus,
  { tone: 'info' | 'success' | 'warning' | 'danger'; label: string }
> = {
  draft: { tone: 'info', label: 'Draft' },
  submitted: { tone: 'info', label: 'Submitted' },
  in_review: { tone: 'info', label: 'In review' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
  needs_more_info: { tone: 'warning', label: 'More info requested' },
};

const SPORT_OPTIONS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'Soccer', 'UFC', 'Tennis', 'Golf'];

export function CreatorApplyPage() {
  const { user, tenantId, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const existing = useMyCreatorApplication(tenantId as any, user?.id as any);
  const upsertDraft = useUpsertCreatorDraft();
  const submit = useSubmitCreatorApplication();

  // Form state — hydrated from existing draft when present
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [primarySports, setPrimarySports] = useState<string[]>([]);
  const [nicheTags, setNicheTags] = useState('');
  const [externalLinks, setExternalLinks] = useState<CreatorApplicationLink[]>([{ label: '', url: '' }]);
  const [sampleNotes, setSampleNotes] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Hydrate when existing draft loads
  useEffect(() => {
    if (!existing) return;
    setFullName(existing.fullName ?? '');
    setCountry(existing.country ?? '');
    setDateOfBirth(existing.dateOfBirth ?? '');
    setHandle(existing.handle ?? '');
    setDisplayName(existing.displayName ?? '');
    setBio(existing.bio ?? '');
    setPrimarySports(existing.primarySports ?? []);
    setNicheTags((existing.nicheTags ?? []).join(', '));
    setExternalLinks(existing.externalLinks?.length ? existing.externalLinks : [{ label: '', url: '' }]);
    setSampleNotes(existing.sampleNotes ?? '');
    setAgeConfirmed(existing.ageConfirmed ?? false);
    setRulesAccepted(existing.rulesAccepted ?? false);
  }, [existing?._id]);

  const isReadOnly = useMemo(() => {
    if (!existing) return false;
    return existing.status === 'submitted' || existing.status === 'in_review' || existing.status === 'approved';
  }, [existing?.status]);

  if (authLoading) return <Spinner />;
  if (!user || !tenantId) return <Navigate to="/login?redirect=/creator-apply" replace />;

  function buildDraft() {
    return {
      fullName: fullName.trim(),
      country: country.trim(),
      dateOfBirth: dateOfBirth || undefined,
      handle: handle.trim().toLowerCase(),
      displayName: displayName.trim(),
      bio: bio.trim(),
      primarySports,
      nicheTags: nicheTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      externalLinks: externalLinks.filter((l) => l.url.trim().length > 0),
      sampleNotes: sampleNotes.trim() || undefined,
      ageConfirmed,
      rulesAccepted,
    };
  }

  async function handleSaveDraft() {
    setError(null);
    setBusy(true);
    try {
      await upsertDraft(tenantId as any, user!.id as any, buildDraft());
      setSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save draft');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      const { id } = await upsertDraft(tenantId as any, user!.id as any, buildDraft());
      await submit(tenantId as any, user!.id as any, id);
      // Refetch happens via Convex subscription
    } catch (e: any) {
      setError(e?.message ?? 'Failed to submit application');
    } finally {
      setBusy(false);
    }
  }

  function toggleSport(sport: string) {
    setPrimarySports((prev) => (prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]));
  }

  function updateLink(index: number, patch: Partial<CreatorApplicationLink>) {
    setExternalLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function addLink() {
    setExternalLinks((prev) => [...prev, { label: '', url: '' }]);
  }

  function removeLink(index: number) {
    setExternalLinks((prev) => prev.filter((_, i) => i !== index));
  }

  const statusBadge = existing ? STATUS_TONE[existing.status] : null;

  return (
    <Stack gap="6" style={{ maxWidth: '880px', margin: '0 auto', padding: 'var(--ds-size-6)' }}>
      <Stack gap="2">
        <Heading level={1} data-size="lg">
          Apply to become a DigiPicks creator
        </Heading>
        <Paragraph>
          Tell us about yourself, your niche, and your track record. Our team reviews every application to keep
          DigiPicks curated and trust-first.
        </Paragraph>
        {statusBadge && (
          <div>
            <Tag
              data-color={
                statusBadge.tone === 'success'
                  ? 'success'
                  : statusBadge.tone === 'danger'
                    ? 'danger'
                    : statusBadge.tone === 'warning'
                      ? 'warning'
                      : 'info'
              }
            >
              {statusBadge.label}
            </Tag>
          </div>
        )}
        {existing?.reviewNote && (
          <Alert data-color={existing.status === 'rejected' ? 'danger' : 'warning'}>
            <strong>Reviewer note:</strong> {existing.reviewNote}
          </Alert>
        )}
      </Stack>

      {error && <Alert data-color="danger">{error}</Alert>}

      {/* Identity */}
      <Card>
        <Card.Block>
          <Heading level={2} data-size="sm">
            Identity
          </Heading>
        </Card.Block>
        <Card.Block>
          <Stack gap="4">
            <Textfield
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              readOnly={isReadOnly}
              required
            />
            <Textfield
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              readOnly={isReadOnly}
              required
            />
            <Textfield
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              readOnly={isReadOnly}
            />
          </Stack>
        </Card.Block>
      </Card>

      {/* Profile */}
      <Card>
        <Card.Block>
          <Heading level={2} data-size="sm">
            Public profile
          </Heading>
        </Card.Block>
        <Card.Block>
          <Stack gap="4">
            <Textfield
              label="Handle"
              description="Lowercase, 3–24 characters. This becomes your /@handle URL."
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              readOnly={isReadOnly}
              required
            />
            <Textfield
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              readOnly={isReadOnly}
              required
            />
            <Textarea
              label="Bio"
              description="20–400 characters. Tell subscribers who you are and what you bet."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              readOnly={isReadOnly}
              rows={4}
              required
            />
            <div>
              <Paragraph data-size="sm" style={{ marginBottom: 'var(--ds-size-2)' }}>
                Primary sports
              </Paragraph>
              <Stack direction="row" gap="2" style={{ flexWrap: 'wrap' }}>
                {SPORT_OPTIONS.map((sport) => (
                  <Tag
                    key={sport}
                    data-color={primarySports.includes(sport) ? 'accent' : 'neutral'}
                    onClick={isReadOnly ? undefined : () => toggleSport(sport)}
                    style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
                  >
                    {sport}
                  </Tag>
                ))}
              </Stack>
            </div>
            <Textfield
              label="Niche tags (comma-separated)"
              description="e.g. NFL props, NBA player props, MLB unders"
              value={nicheTags}
              onChange={(e) => setNicheTags(e.target.value)}
              readOnly={isReadOnly}
            />
          </Stack>
        </Card.Block>
      </Card>

      {/* Proof */}
      <Card>
        <Card.Block>
          <Heading level={2} data-size="sm">
            Proof &amp; presence
          </Heading>
        </Card.Block>
        <Card.Block>
          <Stack gap="4">
            <Paragraph data-size="sm">Add 1–3 links: social profiles, public picks history, Discord, etc.</Paragraph>
            {externalLinks.map((link, i) => (
              <Stack key={i} direction="row" gap="2">
                <Textfield
                  label={`Label ${i + 1}`}
                  value={link.label}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  readOnly={isReadOnly}
                  style={{ flex: '1 1 30%' }}
                />
                <Textfield
                  label={`URL ${i + 1}`}
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  readOnly={isReadOnly}
                  style={{ flex: '1 1 60%' }}
                />
                {!isReadOnly && externalLinks.length > 1 && (
                  <Button data-variant="tertiary" onClick={() => removeLink(i)}>
                    Remove
                  </Button>
                )}
              </Stack>
            ))}
            {!isReadOnly && externalLinks.length < 5 && (
              <Button data-variant="secondary" onClick={addLink}>
                + Add another link
              </Button>
            )}
            <Textarea
              label="Sample picks or analysis (optional)"
              description="Paste 2–3 recent picks with reasoning, or a short analysis sample."
              value={sampleNotes}
              onChange={(e) => setSampleNotes(e.target.value)}
              readOnly={isReadOnly}
              rows={5}
            />
          </Stack>
        </Card.Block>
      </Card>

      {/* Attestation */}
      <Card>
        <Card.Block>
          <Heading level={2} data-size="sm">
            Attestation
          </Heading>
        </Card.Block>
        <Card.Block>
          <Stack gap="3">
            <Checkbox
              label="I confirm I am 18 years or older."
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed((e.target as HTMLInputElement).checked)}
              disabled={isReadOnly}
            />
            <Checkbox
              label="I agree to follow DigiPicks community rules and content guidelines."
              checked={rulesAccepted}
              onChange={(e) => setRulesAccepted((e.target as HTMLInputElement).checked)}
              disabled={isReadOnly}
            />
          </Stack>
        </Card.Block>
      </Card>

      {!isReadOnly && (
        <Stack direction="row" gap="3" justify="end">
          {savedAt && (
            <Paragraph data-size="sm" style={{ alignSelf: 'center' }}>
              Draft saved
            </Paragraph>
          )}
          <Button data-variant="secondary" onClick={handleSaveDraft} disabled={busy}>
            Save draft
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !ageConfirmed || !rulesAccepted}>
            Submit application
          </Button>
        </Stack>
      )}

      {existing?.status === 'approved' && (
        <Alert data-color="success">
          You&apos;re a verified creator. Head to the dashboard to start publishing picks.
          <Button
            data-variant="primary"
            onClick={() => navigate('/dashboard')}
            style={{ marginLeft: 'var(--ds-size-3)' }}
          >
            Go to dashboard
          </Button>
        </Alert>
      )}
    </Stack>
  );
}

export default CreatorApplyPage;
