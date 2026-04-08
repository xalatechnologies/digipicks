/**
 * Pick Create/Edit Page
 *
 * Structured form for creating and editing a sports betting pick.
 * Fields: event, sport, pick type, selection, odds, units, confidence, analysis.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useT } from '@digilist-saas/i18n';
import {
    Button,
    Heading,
    Card,
    Spinner,
    Textfield,
    Textarea,
    ErrorState,
    NativeSelect,
    PageContentLayout,
    ArrowLeftIcon,
} from '@digilist-saas/ds';
import {
    usePick,
    useCreatePick,
    useUpdatePick,
    type PickCategory,
    type Confidence,
} from '@digilist-saas/sdk';
import { useAuthBridge } from '@digilist-saas/app-shell';
import styles from './pick-edit.module.css';

// ─────────────────────────── Constants ───────────────────────────

const SPORTS = ['NBA', 'NFL', 'MLB', 'NHL', 'Soccer', 'UFC', 'Tennis', 'Golf', 'NCAAB', 'NCAAF', 'Other'];
const PICK_TYPES = [
    { value: 'spread', label: 'Spread' },
    { value: 'moneyline', label: 'Moneyline' },
    { value: 'total', label: 'Total (O/U)' },
    { value: 'prop', label: 'Player Prop' },
    { value: 'parlay_leg', label: 'Parlay Leg' },
];
const CONFIDENCE_LEVELS = [
    { value: 'low', label: 'Low', color: 'neutral' as const },
    { value: 'medium', label: 'Medium', color: 'info' as const },
    { value: 'high', label: 'High', color: 'success' as const },
];

// ─────────────────────────── Helpers ───────────────────────────

function americanToDecimal(american: string): number | null {
    const num = parseInt(american, 10);
    if (isNaN(num) || num === 0) return null;
    if (num > 0) return +(num / 100 + 1).toFixed(2);
    return +(100 / Math.abs(num) + 1).toFixed(2);
}

// ─────────────────────────── Component ───────────────────────────

export function PickEditPage() {
    const t = useT();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditing = !!id;
    const { user } = useAuthBridge();
    const tenantId = user?.tenantId as any;
    const userId = user?.id;

    // Fetch existing pick for editing
    const { pick, isLoading: pickLoading } = usePick(isEditing ? id : undefined);

    // Form state
    const [event, setEvent] = useState('');
    const [sport, setSport] = useState('NBA');
    const [league, setLeague] = useState('');
    const [pickType, setPickType] = useState<string>('spread');
    const [selection, setSelection] = useState('');
    const [oddsAmerican, setOddsAmerican] = useState('-110');
    const [units, setUnits] = useState('1');
    const [confidence, setConfidence] = useState<string>('medium');
    const [analysis, setAnalysis] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize form from existing pick data
    useMemo(() => {
        if (pick) {
            setEvent(pick.event);
            setSport(pick.sport);
            setLeague(pick.league ?? '');
            setPickType(pick.pickType);
            setSelection(pick.selection);
            setOddsAmerican(pick.oddsAmerican);
            setUnits(String(pick.units));
            setConfidence(pick.confidence);
            setAnalysis(pick.analysis ?? '');
        }
    }, [pick]);

    // Mutations
    const { mutateAsync: createPick } = useCreatePick();
    const { mutateAsync: updatePick } = useUpdatePick();

    // Computed odds
    const oddsDecimal = useMemo(() => americanToDecimal(oddsAmerican), [oddsAmerican]);
    const payoutPreview = useMemo(() => {
        const decimal = oddsDecimal;
        const u = parseFloat(units) || 0;
        if (!decimal || u <= 0) return null;
        const profit = u * (decimal - 1);
        return { profit: profit.toFixed(1), total: (u + profit).toFixed(1) };
    }, [oddsDecimal, units]);

    // Validation
    const isValid = useMemo(() => {
        return (
            event.trim().length > 0 &&
            selection.trim().length > 0 &&
            oddsAmerican.trim().length > 0 &&
            oddsDecimal !== null &&
            oddsDecimal >= 1.01 &&
            parseFloat(units) > 0
        );
    }, [event, selection, oddsAmerican, oddsDecimal, units]);

    const handleSave = useCallback(async () => {
        if (!tenantId || !userId || !oddsDecimal) return;
        setSaving(true);
        setError(null);

        try {
            if (isEditing && id) {
                await updatePick({
                    id,
                    callerId: userId as any,
                    event: event.trim(),
                    sport,
                    league: league.trim() || undefined,
                    pickType: pickType as PickCategory,
                    selection: selection.trim(),
                    oddsAmerican: oddsAmerican.trim(),
                    oddsDecimal,
                    units: parseFloat(units),
                    confidence: confidence as Confidence,
                    analysis: analysis.trim() || undefined,
                });
            } else {
                await createPick({
                    tenantId,
                    creatorId: userId as any,
                    event: event.trim(),
                    sport,
                    league: league.trim() || undefined,
                    pickType: pickType as PickCategory,
                    selection: selection.trim(),
                    oddsAmerican: oddsAmerican.trim(),
                    oddsDecimal,
                    units: parseFloat(units),
                    confidence: confidence as Confidence,
                    analysis: analysis.trim() || undefined,
                    status: 'published',
                });
            }
            navigate('/picks');
        } catch (err: any) {
            setError(err?.message ?? 'Failed to save pick');
        } finally {
            setSaving(false);
        }
    }, [tenantId, userId, isEditing, id, event, sport, league, pickType, selection, oddsAmerican, oddsDecimal, units, confidence, analysis, createPick, updatePick, navigate]);

    if (pickLoading) {
        return (
            <PageContentLayout>
                <div className={styles.page}>
                    <Spinner data-size="lg" />
                </div>
            </PageContentLayout>
        );
    }

    return (
        <PageContentLayout>
            <div className={styles.page}>
                {/* Header */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-size-3)' }}>
                        <Button variant="tertiary" onClick={() => navigate('/picks')}>
                            <ArrowLeftIcon />
                        </Button>
                        <Heading data-size="lg">
                            {isEditing ? t('picks.editTitle', 'Edit Pick') : t('picks.createTitle', 'New Pick')}
                        </Heading>
                    </div>
                </div>

                {error && (
                    <ErrorState
                        title={t('picks.error', 'Error')}
                        message={error}
                    />
                )}

                <Card>
                    <div className={styles.formCard}>
                        {/* Event Info */}
                        <div className={styles.formSection}>
                            <div className={styles.sectionTitle}>Event Info</div>
                            <div className={styles.formRow}>
                                <Textfield
                                    label="Event / Matchup"
                                    placeholder="e.g. Lakers vs Celtics"
                                    value={event}
                                    onChange={(e) => setEvent(e.target.value)}
                                    required
                                />
                                <NativeSelect
                                    label="Sport"
                                    value={sport}
                                    onChange={(e) => setSport(e.target.value)}
                                >
                                    {SPORTS.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </NativeSelect>
                            </div>
                            <div className={styles.formRow} style={{ marginTop: 'var(--ds-size-4)' }}>
                                <Textfield
                                    label="League (optional)"
                                    placeholder="e.g. Western Conference"
                                    value={league}
                                    onChange={(e) => setLeague(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Pick Details */}
                        <div className={styles.formSection}>
                            <div className={styles.sectionTitle}>Pick Details</div>
                            <div className={styles.formRow}>
                                <NativeSelect
                                    label="Pick Type"
                                    value={pickType}
                                    onChange={(e) => setPickType(e.target.value)}
                                >
                                    {PICK_TYPES.map((pt) => (
                                        <option key={pt.value} value={pt.value}>{pt.label}</option>
                                    ))}
                                </NativeSelect>
                                <Textfield
                                    label="Selection"
                                    placeholder="e.g. Lakers -3.5, Over 220.5"
                                    value={selection}
                                    onChange={(e) => setSelection(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Odds & Units */}
                        <div className={styles.formSection}>
                            <div className={styles.sectionTitle}>Odds & Sizing</div>
                            <div className={styles.formRow3}>
                                <Textfield
                                    label="Odds (American)"
                                    placeholder="-110"
                                    value={oddsAmerican}
                                    onChange={(e) => setOddsAmerican(e.target.value)}
                                    required
                                />
                                <Textfield
                                    label="Units"
                                    placeholder="1"
                                    value={units}
                                    onChange={(e) => setUnits(e.target.value)}
                                    required
                                />
                                <div>
                                    <div className={styles.confidenceLabel}>
                                        Confidence
                                    </div>
                                    <div className={styles.confidenceGroup}>
                                        {CONFIDENCE_LEVELS.map((cl) => (
                                            <Button
                                                key={cl.value}
                                                variant={confidence === cl.value ? 'primary' : 'secondary'}
                                                data-size="sm"
                                                className={styles.confidenceButton}
                                                onClick={() => setConfidence(cl.value)}
                                            >
                                                {cl.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Odds Preview */}
                            {oddsDecimal && (
                                <div className={styles.oddsPreview}>
                                    <span>Decimal: </span>
                                    <span className={styles.oddsPreviewValue}>{oddsDecimal.toFixed(2)}</span>
                                    {payoutPreview && (
                                        <>
                                            <span style={{ marginLeft: 'var(--ds-size-4)' }}>Potential profit: </span>
                                            <span className={styles.oddsPreviewValue}>+{payoutPreview.profit}u</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Analysis */}
                        <div className={styles.formSection}>
                            <div className={styles.sectionTitle}>Analysis (optional)</div>
                            <Textarea
                                placeholder="Share your reasoning for this pick..."
                                value={analysis}
                                onChange={(e) => setAnalysis(e.target.value)}
                                rows={4}
                            />
                        </div>

                        {/* Actions */}
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => navigate('/picks')}>
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleSave}
                                disabled={!isValid || saving}
                            >
                                {saving
                                    ? (isEditing ? t('picks.saving', 'Saving...') : t('picks.creating', 'Creating...'))
                                    : (isEditing ? t('picks.save', 'Save Changes') : t('picks.publish', 'Publish Pick'))
                                }
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </PageContentLayout>
    );
}
