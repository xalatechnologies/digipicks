/**
 * Smart Seat Allocation -- Center-out with gap penalty
 *
 * Platform utility (not domain-specific). Pure TypeScript functions with no
 * Convex imports -- can be used in any runtime (server, worker, test).
 *
 * Algorithm overview:
 *   1. Filter to available seats (not held/sold/blocked)
 *   2. Group by row
 *   3. Find contiguous blocks >= requestedCount in each row
 *   4. Score every candidate block (center bonus, gap penalty, adjacency, row pref)
 *   5. Return top 3 options sorted by score descending
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Seat {
    seatId: string;
    sectionId: string;
    rowLabel: string;
    number: number;
    x: number;
    y: number;
    status: "active" | "blocked" | "wheelchair" | "companion" | "restricted_view";
}

export interface SeatReservation {
    seatId: string;
    status: "available" | "held" | "sold" | "blocked";
}

export interface AllocationResult {
    seats: string[]; // seatIds
    score: number;
    section: string;
    row: string;
}

export interface AllocationPreferences {
    /** Prefer wheelchair-accessible seats */
    wheelchair?: boolean;
    /** Prefer a specific section */
    preferredSectionId?: string;
    /** Prefer a specific row label */
    preferredRowLabel?: string;
}

// =============================================================================
// MAIN ALGORITHM
// =============================================================================

/**
 * Select the best available seats using a center-out scoring algorithm
 * with gap penalty.
 *
 * @returns Top 3 scored options, sorted by score descending. Returns an empty
 *          array if no valid contiguous block of the requested size exists.
 */
export function selectBestAvailableSeats(params: {
    seats: Seat[];
    reservations: SeatReservation[];
    requestedCount: number;
    preferences?: AllocationPreferences;
}): AllocationResult[] {
    const { seats, reservations, requestedCount, preferences } = params;

    if (requestedCount <= 0) return [];
    if (seats.length === 0) return [];

    // Build a lookup of seat reservation status
    const reservationMap = new Map<string, SeatReservation["status"]>();
    for (const r of reservations) {
        reservationMap.set(r.seatId, r.status);
    }

    // Filter to available, bookable seats
    const availableSeats = seats.filter((s) => {
        const resStatus = reservationMap.get(s.seatId);
        if (resStatus === "held" || resStatus === "sold" || resStatus === "blocked") {
            return false;
        }
        // Blocked seats in the seat map itself are not available unless wheelchair is requested
        if (s.status === "blocked") return false;
        if (s.status === "wheelchair" && !preferences?.wheelchair) return false;
        if (s.status === "restricted_view") return true; // available but may score lower
        return true;
    });

    // Group by (sectionId, rowLabel)
    const rowGroups = new Map<string, Seat[]>();
    for (const seat of availableSeats) {
        const key = `${seat.sectionId}::${seat.rowLabel}`;
        const group = rowGroups.get(key);
        if (group) {
            group.push(seat);
        } else {
            rowGroups.set(key, [seat]);
        }
    }

    // Also build full-row lookups (all seats in the row, regardless of availability)
    const fullRowGroups = new Map<string, Seat[]>();
    for (const seat of seats) {
        const key = `${seat.sectionId}::${seat.rowLabel}`;
        const group = fullRowGroups.get(key);
        if (group) {
            group.push(seat);
        } else {
            fullRowGroups.set(key, [seat]);
        }
    }

    const candidates: AllocationResult[] = [];

    for (const [key, rowAvailable] of rowGroups) {
        const [sectionId, rowLabel] = key.split("::");
        const allSeatsInRow = fullRowGroups.get(key) ?? [];

        // Sort by seat number for contiguous block detection
        const sorted = [...rowAvailable].sort((a, b) => a.number - b.number);
        const blocks = findContiguousBlocks(sorted, requestedCount);

        for (const block of blocks) {
            const seatIds = block.map((s) => s.seatId);
            const score = calculateSeatScore(
                block,
                allSeatsInRow,
                reservationMap,
                preferences,
                sectionId,
                rowLabel,
            );
            candidates.push({
                seats: seatIds,
                score,
                section: sectionId,
                row: rowLabel,
            });
        }
    }

    // Sort by score descending, return top 3
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 3);
}

// =============================================================================
// SCORING
// =============================================================================

/**
 * Score a candidate seat group.
 *
 * Scoring components:
 *   - Center bonus:    closer to center of row = higher (max +100)
 *   - Gap penalty:     leaving an isolated single empty seat = -50 each
 *   - Adjacency bonus: each consecutive pair = +10
 *   - Row preference:  lower row numbers get a slight bonus (max +20)
 *   - Section pref:    matching preferred section = +30
 *   - Row pref:        matching preferred row = +15
 */
export function calculateSeatScore(
    selectedSeats: Seat[],
    allSeatsInRow: Seat[],
    reservations: Map<string, SeatReservation["status"]>,
    preferences?: AllocationPreferences,
    sectionId?: string,
    rowLabel?: string,
): number {
    if (selectedSeats.length === 0) return 0;

    const sortedAll = [...allSeatsInRow].sort((a, b) => a.number - b.number);
    const rowMin = sortedAll[0].number;
    const rowMax = sortedAll[sortedAll.length - 1].number;
    const rowCenter = (rowMin + rowMax) / 2;

    // ---- Center score (0..100) ----
    const halfWidth = Math.max(1, (rowMax - rowMin) / 2);
    let centerPenalty = 0;
    for (const s of selectedSeats) {
        const distFromCenter = Math.abs(s.number - rowCenter);
        centerPenalty += distFromCenter / halfWidth;
    }
    const avgCenterPenalty = centerPenalty / selectedSeats.length;
    const centerScore = Math.max(0, 100 - avgCenterPenalty * 100);

    // ---- Adjacency bonus ----
    const sortedSelected = [...selectedSeats].sort((a, b) => a.number - b.number);
    let adjacencyBonus = 0;
    for (let i = 1; i < sortedSelected.length; i++) {
        if (sortedSelected[i].number === sortedSelected[i - 1].number + 1) {
            adjacencyBonus += 10;
        }
    }

    // ---- Gap penalty ----
    const selectedIds = new Set(selectedSeats.map((s) => s.seatId));
    const gapCount = wouldCreateGap(selectedIds, allSeatsInRow, reservations);
    const gapPenalty = gapCount * -50;

    // ---- Row preference bonus (lower rows = slight bonus) ----
    const rowNumber = parseInt(rowLabel ?? "1", 10);
    const rowBonus = isNaN(rowNumber) ? 0 : Math.max(0, 20 - rowNumber);

    // ---- Section / row preference bonus ----
    let prefBonus = 0;
    if (preferences?.preferredSectionId && sectionId === preferences.preferredSectionId) {
        prefBonus += 30;
    }
    if (preferences?.preferredRowLabel && rowLabel === preferences.preferredRowLabel) {
        prefBonus += 15;
    }

    return Math.round(centerScore + adjacencyBonus + gapPenalty + rowBonus + prefBonus);
}

// =============================================================================
// CONTIGUOUS BLOCK FINDER
// =============================================================================

/**
 * Find all contiguous blocks of available seats >= requestedCount in a
 * sorted (by number) array of available seats.
 *
 * Returns arrays of Seat objects, each of length === requestedCount.
 * Slides a window of requestedCount over every contiguous run.
 */
export function findContiguousBlocks(
    sortedAvailable: Seat[],
    requestedCount: number,
): Seat[][] {
    if (sortedAvailable.length < requestedCount) return [];

    const results: Seat[][] = [];

    // Identify contiguous runs (consecutive seat numbers with no gaps)
    let runStart = 0;
    for (let i = 1; i <= sortedAvailable.length; i++) {
        const isEnd =
            i === sortedAvailable.length ||
            sortedAvailable[i].number !== sortedAvailable[i - 1].number + 1;

        if (isEnd) {
            const runLength = i - runStart;
            if (runLength >= requestedCount) {
                // Slide a window of requestedCount over this run
                for (let j = runStart; j <= i - requestedCount; j++) {
                    results.push(sortedAvailable.slice(j, j + requestedCount));
                }
            }
            runStart = i;
        }
    }

    return results;
}

// =============================================================================
// GAP DETECTION
// =============================================================================

/**
 * Count how many isolated single-empty-seat gaps would be created if
 * `selectedSeatIds` are removed from the available pool.
 *
 * An "isolated single" is a seat that would be available but has no
 * available neighbor on either side (both neighbors are unavailable
 * or are the edge of the row).
 */
export function wouldCreateGap(
    selectedSeatIds: Set<string>,
    allSeatsInRow: Seat[],
    reservations: Map<string, SeatReservation["status"]>,
): number {
    const sorted = [...allSeatsInRow].sort((a, b) => a.number - b.number);

    // Build availability map after hypothetical selection
    const availableAfter = new Map<number, boolean>();
    for (const s of sorted) {
        const resStatus = reservations.get(s.seatId);
        const currentlyUnavailable =
            resStatus === "held" || resStatus === "sold" || resStatus === "blocked";
        const wouldBeSelected = selectedSeatIds.has(s.seatId);
        availableAfter.set(s.number, !currentlyUnavailable && !wouldBeSelected);
    }

    // Check for isolated singles
    let gapCount = 0;
    for (let i = 0; i < sorted.length; i++) {
        const seat = sorted[i];
        if (!availableAfter.get(seat.number)) continue;

        const prevAvailable =
            i > 0 && sorted[i - 1].number === seat.number - 1
                ? availableAfter.get(sorted[i - 1].number)
                : false;
        const nextAvailable =
            i < sorted.length - 1 && sorted[i + 1].number === seat.number + 1
                ? availableAfter.get(sorted[i + 1].number)
                : false;

        if (!prevAvailable && !nextAvailable) {
            gapCount++;
        }
    }

    return gapCount;
}
