import { query } from "../_generated/server";
import { components } from "../_generated/api";
import { v } from "convex/values";

/**
 * Search Functions
 * Global search and typeahead across resources with full-text search
 * across all fields including metadata.
 *
 * Resources are now in a component. We fetch them via
 * components.resources.queries.list (tenant-scoped) or
 * components.resources.queries.listPublic (public).
 *
 * Features:
 * - Fuzzy matching (Levenshtein distance) for typo tolerance
 * - Norwegian character normalization (æ, ø, å)
 * - Word boundary matching boosts
 * - Smart category suggestions
 * - Single character search support
 */

// Search weight configuration - higher = more important
const SEARCH_WEIGHTS = {
    nameExact: 100,
    nameStart: 80,
    nameContains: 60,
    nameFuzzy: 45,           // Fuzzy match on name
    slug: 50,
    categoryKey: 45,
    subcategoryKey: 40,
    description: 35,
    descriptionFuzzy: 20,    // Fuzzy match on description
    featureName: 30,
    metadataCity: 28,
    metadataCityFuzzy: 18,   // Fuzzy match on city
    metadataAddress: 25,
    metadataAmenity: 22,
    metadataFacility: 22,
    metadataRuleTitle: 18,
    metadataFaqQuestion: 18,
    metadataContact: 15,
    metadataEvent: 12,
    metadataOther: 10,
    locationCity: 32,
    locationAddress: 30,
    locationMunicipality: 28,
    subtitle: 26,
    promotedAmenity: 24,
    wordBoundaryBonus: 15,   // Bonus for matching at word boundary
};

// Norwegian character mappings for normalization
const NORWEGIAN_CHAR_MAP: Record<string, string> = {
    "æ": "ae", "ø": "o", "å": "a",
    "Æ": "ae", "Ø": "o", "Å": "a",
};

// Category display names for smart suggestions
const CATEGORY_DISPLAY_NAMES: Record<string, { name: string; description: string; keywords: string[]; synonyms: string[] }> = {
    "LOKALER": {
        name: "Lokaler",
        description: "Møterom, selskapslokaler, konferanserom",
        keywords: ["møte", "selskap", "konferanse", "rom", "lokale", "sal", "gymsal", "scene", "auditorium", "festsal"],
        synonyms: ["plass", "sted", "venue", "location", "hall"]
    },
    "SPORT": {
        name: "Sport & Aktiviteter",
        description: "Idrettshaller, baner, treningsrom",
        keywords: ["sport", "idrett", "trening", "hall", "bane", "padel", "squash", "tennis", "fotball", "basketball", "volleyball", "badminton", "bordtennis", "golf", "svømme", "klatre"],
        synonyms: ["aktivitet", "activity", "exercise", "fitness", "gym"]
    },
    "ARRANGEMENTER": {
        name: "Arrangementer",
        description: "Kurs, workshops, konserter, events",
        keywords: ["kurs", "workshop", "konsert", "event", "arrangement", "seminar", "foredrag", "fest", "konferanse", "festival", "teater", "show"],
        synonyms: ["hendelse", "happening", "billett", "ticket"]
    },
    "TORGET": {
        name: "Torget",
        description: "Utstyr, verktøy, tilbehør til leie",
        keywords: ["utstyr", "leie", "verktøy", "lyd", "lys", "grill", "telt", "bord", "stol", "projektor", "mikrofon", "kamera", "høyttaler", "scene"],
        synonyms: ["ting", "stuff", "gear", "equipment", "rental"]
    },
};

// Intent detection patterns
const INTENT_PATTERNS: Record<string, { keywords: string[]; suggestionType: string; suggestionLabel: string }> = {
    booking: {
        keywords: ["book", "reserve", "bestill", "leie", "lei", "finn", "søk", "ledig", "tilgjengelig", "når"],
        suggestionType: "intent",
        suggestionLabel: "Finn tilgjengelige tider"
    },
    event: {
        keywords: ["billett", "ticket", "påmelding", "meld", "delta", "join", "event"],
        suggestionType: "intent",
        suggestionLabel: "Se kommende arrangementer"
    },
    location: {
        keywords: ["nær", "i nærheten", "oslo", "bergen", "trondheim", "stavanger", "tromsø", "kristiansand", "drammen", "fredrikstad", "sandnes", "bodø"],
        suggestionType: "location",
        suggestionLabel: "Søk etter lokasjon"
    },
    price: {
        keywords: ["pris", "kost", "billig", "gratis", "free", "cheap", "budget", "rimelig"],
        suggestionType: "price",
        suggestionLabel: "Filtrer etter pris"
    },
};

// Popular search terms (could be dynamic from analytics)
const POPULAR_SEARCHES = [
    { term: "padel", category: "SPORT", label: "Padelbaner" },
    { term: "møterom", category: "LOKALER", label: "Møterom" },
    { term: "selskapslokale", category: "LOKALER", label: "Selskapslokaler" },
    { term: "kurs", category: "ARRANGEMENTER", label: "Kurs & workshops" },
    { term: "squash", category: "SPORT", label: "Squashbaner" },
    { term: "grill", category: "TORGET", label: "Grillutstyr" },
];

interface SearchMatch {
    field: string;
    value: string;
    weight: number;
    matchType?: "exact" | "start" | "contains" | "fuzzy" | "boundary";
}

interface SearchResultItem {
    id: string;
    name: string;
    slug: string;
    description?: string;
    categoryKey: string;
    subcategoryKeys?: string[];
    status: string;
    images: any[];
    score: number;
    matches: SearchMatch[];
    metadata?: any;
}

interface CategorySuggestion {
    type: "category";
    key: string;
    name: string;
    description: string;
    score: number;
    resourceCount?: number;
}

// =============================================================================
// Fuzzy Matching Helpers
// =============================================================================

/**
 * Normalize Norwegian characters to ASCII equivalents
 */
function normalizeNorwegian(text: string): string {
    return text.split("").map(c => NORWEGIAN_CHAR_MAP[c] || c).join("");
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Check if two strings are fuzzy matches
 * Allows 1 error for strings <= 4 chars, 2 for longer strings
 */
function isFuzzyMatch(text: string, term: string): boolean {
    const normalizedText = normalizeNorwegian(text.toLowerCase());
    const normalizedTerm = normalizeNorwegian(term.toLowerCase());

    // For very short terms, require exact or starts-with
    if (normalizedTerm.length <= 2) {
        return normalizedText.startsWith(normalizedTerm) ||
               normalizedText.includes(normalizedTerm);
    }

    // Check if any word in the text is a fuzzy match
    const words = normalizedText.split(/\s+/);
    const maxDistance = normalizedTerm.length <= 4 ? 1 : 2;

    for (const word of words) {
        // Check prefix match (word starts with term)
        if (word.startsWith(normalizedTerm)) return true;

        // Check if term is a prefix of word with fuzzy tolerance
        const prefix = word.slice(0, normalizedTerm.length + maxDistance);
        const distance = levenshteinDistance(prefix, normalizedTerm);
        if (distance <= maxDistance) return true;
    }

    // Also check full text contains
    return normalizedText.includes(normalizedTerm);
}

/**
 * Check if the term matches at a word boundary
 */
function matchesAtWordBoundary(text: string, term: string): boolean {
    if (!text || typeof text !== "string") return false;
    const normalizedText = normalizeNorwegian(text.toLowerCase());
    const normalizedTerm = normalizeNorwegian(term.toLowerCase());

    // Check if any word starts with the term
    const words = normalizedText.split(/[\s\-_,;.]+/);
    return words.some(word => word.startsWith(normalizedTerm));
}

// =============================================================================
// Basic Matching Helpers
// =============================================================================

/**
 * Helper: Check if a string contains the search term (case-insensitive)
 * Now includes Norwegian character normalization
 */
function containsTerm(text: unknown, term: string): boolean {
    if (!text || typeof text !== "string") return false;
    const normalizedText = normalizeNorwegian(text.toLowerCase());
    const normalizedTerm = normalizeNorwegian(term.toLowerCase());
    return normalizedText.includes(normalizedTerm);
}

/**
 * Helper: Check if string starts with term
 */
function startsWith(text: unknown, term: string): boolean {
    if (!text || typeof text !== "string") return false;
    const normalizedText = normalizeNorwegian(text.toLowerCase());
    const normalizedTerm = normalizeNorwegian(term.toLowerCase());
    return normalizedText.startsWith(normalizedTerm);
}

/**
 * Helper: Check if string exactly matches term
 */
function exactMatch(text: unknown, term: string): boolean {
    if (!text || typeof text !== "string") return false;
    const normalizedText = normalizeNorwegian(text.toLowerCase());
    const normalizedTerm = normalizeNorwegian(term.toLowerCase());
    return normalizedText === normalizedTerm;
}

/**
 * Helper: Search through an array of strings
 */
function searchStringArray(arr: string[] | undefined, term: string): string[] {
    if (!arr || !Array.isArray(arr)) return [];
    return arr.filter(item => containsTerm(item, term) || isFuzzyMatch(item, term));
}


interface IntentSuggestion {
    type: "intent" | "popular" | "location";
    key: string;
    label: string;
    description: string;
    score: number;
    action?: string;
    category?: string;
}

/**
 * Detect user intent from search term
 */
function detectIntent(term: string): IntentSuggestion[] {
    const normalizedTerm = normalizeNorwegian(term.toLowerCase());
    const results: IntentSuggestion[] = [];

    for (const [intentKey, intent] of Object.entries(INTENT_PATTERNS)) {
        for (const keyword of intent.keywords) {
            const normalizedKeyword = normalizeNorwegian(keyword.toLowerCase());
            if (normalizedTerm.includes(normalizedKeyword) || normalizedKeyword.startsWith(normalizedTerm)) {
                results.push({
                    type: intent.suggestionType as "intent" | "location",
                    key: intentKey,
                    label: intent.suggestionLabel,
                    description: `Basert på "${term}"`,
                    score: 90,
                    action: intentKey,
                });
                break; // Only one suggestion per intent type
            }
        }
    }

    return results;
}

/**
 * Get popular searches that match the term
 */
function getPopularSearches(term: string): IntentSuggestion[] {
    if (term.length < 1) {
        // Return top popular searches if no term
        return POPULAR_SEARCHES.slice(0, 3).map((p, idx) => ({
            type: "popular" as const,
            key: `popular_${p.term}`,
            label: p.label,
            description: `Populært søk`,
            score: 85 - idx * 5,
            category: p.category,
        }));
    }

    const normalizedTerm = normalizeNorwegian(term.toLowerCase());
    const results: IntentSuggestion[] = [];

    for (const popular of POPULAR_SEARCHES) {
        const normalizedPopular = normalizeNorwegian(popular.term.toLowerCase());
        const normalizedLabel = normalizeNorwegian(popular.label.toLowerCase());

        if (normalizedPopular.startsWith(normalizedTerm) || normalizedLabel.startsWith(normalizedTerm)) {
            results.push({
                type: "popular",
                key: `popular_${popular.term}`,
                label: popular.label,
                description: `Populært i ${CATEGORY_DISPLAY_NAMES[popular.category]?.name || popular.category}`,
                score: 75,
                category: popular.category,
            });
        } else if (normalizedPopular.includes(normalizedTerm) || normalizedLabel.includes(normalizedTerm)) {
            results.push({
                type: "popular",
                key: `popular_${popular.term}`,
                label: popular.label,
                description: `Populært i ${CATEGORY_DISPLAY_NAMES[popular.category]?.name || popular.category}`,
                score: 60,
                category: popular.category,
            });
        }
    }

    return results;
}

/**
 * Get matching categories based on search term (enhanced with synonyms)
 */
function getMatchingCategories(term: string): CategorySuggestion[] {
    const normalizedTerm = normalizeNorwegian(term.toLowerCase());
    const results: CategorySuggestion[] = [];

    for (const [key, info] of Object.entries(CATEGORY_DISPLAY_NAMES)) {
        let score = 0;

        // Check category name
        const normalizedName = normalizeNorwegian(info.name.toLowerCase());
        if (normalizedName.startsWith(normalizedTerm)) {
            score = 100;
        } else if (normalizedName.includes(normalizedTerm)) {
            score = 70;
        }

        // Check keywords
        for (const keyword of info.keywords) {
            const normalizedKeyword = normalizeNorwegian(keyword.toLowerCase());
            if (normalizedKeyword.startsWith(normalizedTerm)) {
                score = Math.max(score, 80);
            } else if (normalizedKeyword.includes(normalizedTerm)) {
                score = Math.max(score, 50);
            } else if (isFuzzyMatch(keyword, term)) {
                score = Math.max(score, 30);
            }
        }

        // Check synonyms (new)
        for (const synonym of info.synonyms) {
            const normalizedSynonym = normalizeNorwegian(synonym.toLowerCase());
            if (normalizedSynonym.startsWith(normalizedTerm)) {
                score = Math.max(score, 65);
            } else if (normalizedSynonym.includes(normalizedTerm)) {
                score = Math.max(score, 40);
            }
        }

        // Check description
        const normalizedDesc = normalizeNorwegian(info.description.toLowerCase());
        if (normalizedDesc.includes(normalizedTerm)) {
            score = Math.max(score, 40);
        }

        if (score > 0) {
            results.push({
                type: "category",
                key,
                name: info.name,
                description: info.description,
                score,
            });
        }
    }

    return results.sort((a, b) => b.score - a.score);
}

/**
 * Get all smart suggestions (categories + intents + popular)
 */
function getSmartSuggestions(term: string): {
    categories: CategorySuggestion[];
    intents: IntentSuggestion[];
    popular: IntentSuggestion[];
} {
    const categories = getMatchingCategories(term);
    const intents = detectIntent(term);
    const popular = getPopularSearches(term);

    return { categories, intents, popular };
}

/**
 * Calculate search score and find all matches for a resource
 * Now with fuzzy matching and word boundary detection.
 * Works with resource objects from the resources component (any shape).
 */
function calculateSearchScore(
    resource: any,
    term: string,
    terms: string[] // Support multi-word search
): { score: number; matches: SearchMatch[] } {
    const matches: SearchMatch[] = [];
    let score = 0;

    // --- Core Fields ---

    // Name (highest priority)
    if (exactMatch(resource.name, term)) {
        score += SEARCH_WEIGHTS.nameExact;
        matches.push({ field: "name", value: resource.name, weight: SEARCH_WEIGHTS.nameExact, matchType: "exact" });
    } else if (startsWith(resource.name, term)) {
        score += SEARCH_WEIGHTS.nameStart;
        matches.push({ field: "name", value: resource.name, weight: SEARCH_WEIGHTS.nameStart, matchType: "start" });
    } else if (matchesAtWordBoundary(resource.name, term)) {
        // Word boundary match (e.g., "tennis" matches "Tennisbane 1")
        score += SEARCH_WEIGHTS.nameContains + SEARCH_WEIGHTS.wordBoundaryBonus;
        matches.push({ field: "name", value: resource.name, weight: SEARCH_WEIGHTS.nameContains + SEARCH_WEIGHTS.wordBoundaryBonus, matchType: "boundary" });
    } else if (containsTerm(resource.name, term)) {
        score += SEARCH_WEIGHTS.nameContains;
        matches.push({ field: "name", value: resource.name, weight: SEARCH_WEIGHTS.nameContains, matchType: "contains" });
    } else if (isFuzzyMatch(resource.name, term)) {
        // Fuzzy match for typos
        score += SEARCH_WEIGHTS.nameFuzzy;
        matches.push({ field: "name", value: resource.name, weight: SEARCH_WEIGHTS.nameFuzzy, matchType: "fuzzy" });
    }

    // Slug
    if (containsTerm(resource.slug, term)) {
        score += SEARCH_WEIGHTS.slug;
        matches.push({ field: "slug", value: resource.slug, weight: SEARCH_WEIGHTS.slug });
    }

    // Category key
    if (containsTerm(resource.categoryKey, term)) {
        score += SEARCH_WEIGHTS.categoryKey;
        matches.push({ field: "categoryKey", value: resource.categoryKey, weight: SEARCH_WEIGHTS.categoryKey });
    }

    // Subcategory keys
    if (resource.subcategoryKeys) {
        const subcatMatches = searchStringArray(resource.subcategoryKeys, term);
        for (const match of subcatMatches) {
            score += SEARCH_WEIGHTS.subcategoryKey;
            matches.push({ field: "subcategoryKey", value: match, weight: SEARCH_WEIGHTS.subcategoryKey });
        }
    }

    // Description
    if (containsTerm(resource.description, term)) {
        score += SEARCH_WEIGHTS.description;
        matches.push({ field: "description", value: resource.description || "", weight: SEARCH_WEIGHTS.description, matchType: "contains" });
    } else if (resource.description && isFuzzyMatch(resource.description, term)) {
        score += SEARCH_WEIGHTS.descriptionFuzzy;
        matches.push({ field: "description", value: resource.description, weight: SEARCH_WEIGHTS.descriptionFuzzy, matchType: "fuzzy" });
    }

    // Subtitle (promoted field)
    if (containsTerm(resource.subtitle, term)) {
        score += SEARCH_WEIGHTS.subtitle;
        matches.push({ field: "subtitle", value: resource.subtitle || "", weight: SEARCH_WEIGHTS.subtitle, matchType: "contains" });
    }

    // Promoted location fields (resource.location.*)
    if (resource.location && typeof resource.location === "object") {
        const loc = resource.location;
        if (containsTerm(loc.city, term)) {
            score += SEARCH_WEIGHTS.locationCity;
            matches.push({ field: "location.city", value: loc.city, weight: SEARCH_WEIGHTS.locationCity, matchType: "contains" });
        } else if (loc.city && isFuzzyMatch(loc.city, term)) {
            score += SEARCH_WEIGHTS.metadataCityFuzzy;
            matches.push({ field: "location.city", value: loc.city, weight: SEARCH_WEIGHTS.metadataCityFuzzy, matchType: "fuzzy" });
        }
        if (containsTerm(loc.address, term)) {
            score += SEARCH_WEIGHTS.locationAddress;
            matches.push({ field: "location.address", value: loc.address, weight: SEARCH_WEIGHTS.locationAddress, matchType: "contains" });
        }
        if (containsTerm(loc.postalCode, term)) {
            score += SEARCH_WEIGHTS.locationAddress;
            matches.push({ field: "location.postalCode", value: loc.postalCode, weight: SEARCH_WEIGHTS.locationAddress });
        }
        if (containsTerm(loc.municipality, term)) {
            score += SEARCH_WEIGHTS.locationMunicipality;
            matches.push({ field: "location.municipality", value: loc.municipality, weight: SEARCH_WEIGHTS.locationMunicipality, matchType: "contains" });
        } else if (loc.municipality && isFuzzyMatch(loc.municipality, term)) {
            score += SEARCH_WEIGHTS.metadataCityFuzzy;
            matches.push({ field: "location.municipality", value: loc.municipality, weight: SEARCH_WEIGHTS.metadataCityFuzzy, matchType: "fuzzy" });
        }
    }

    // Promoted amenities array
    if (resource.amenities && Array.isArray(resource.amenities)) {
        const amenityMatches = searchStringArray(resource.amenities, term);
        for (const match of amenityMatches) {
            score += SEARCH_WEIGHTS.promotedAmenity;
            matches.push({ field: "amenities", value: match, weight: SEARCH_WEIGHTS.promotedAmenity });
        }
    }

    // --- Features Array ---
    if (resource.features && Array.isArray(resource.features)) {
        for (const feature of resource.features) {
            if (feature && (containsTerm(feature.name, term) || containsTerm(feature.label, term) || containsTerm(feature.value, term))) {
                score += SEARCH_WEIGHTS.featureName;
                matches.push({
                    field: "feature",
                    value: feature.name || feature.label || feature.value || "",
                    weight: SEARCH_WEIGHTS.featureName
                });
            }
        }
    }

    // --- Metadata Fields ---
    const meta = resource.metadata;
    if (meta && typeof meta === "object") {
        // Location fields - with fuzzy matching for city names
        if (containsTerm(meta.city, term)) {
            score += SEARCH_WEIGHTS.metadataCity;
            matches.push({ field: "metadata.city", value: meta.city, weight: SEARCH_WEIGHTS.metadataCity, matchType: "contains" });
        } else if (meta.city && isFuzzyMatch(meta.city, term)) {
            score += SEARCH_WEIGHTS.metadataCityFuzzy;
            matches.push({ field: "metadata.city", value: meta.city, weight: SEARCH_WEIGHTS.metadataCityFuzzy, matchType: "fuzzy" });
        }
        if (containsTerm(meta.address, term)) {
            score += SEARCH_WEIGHTS.metadataAddress;
            matches.push({ field: "metadata.address", value: meta.address, weight: SEARCH_WEIGHTS.metadataAddress });
        }
        if (containsTerm(meta.postalCode, term)) {
            score += SEARCH_WEIGHTS.metadataAddress;
            matches.push({ field: "metadata.postalCode", value: meta.postalCode, weight: SEARCH_WEIGHTS.metadataAddress });
        }
        if (containsTerm(meta.municipality, term)) {
            score += SEARCH_WEIGHTS.metadataCity;
            matches.push({ field: "metadata.municipality", value: meta.municipality, weight: SEARCH_WEIGHTS.metadataCity });
        }

        // Location object (nested)
        if (meta.location && typeof meta.location === "object") {
            const loc = meta.location;
            if (containsTerm(loc.city, term)) {
                score += SEARCH_WEIGHTS.metadataCity;
                matches.push({ field: "metadata.location.city", value: loc.city, weight: SEARCH_WEIGHTS.metadataCity });
            }
            if (containsTerm(loc.address, term)) {
                score += SEARCH_WEIGHTS.metadataAddress;
                matches.push({ field: "metadata.location.address", value: loc.address, weight: SEARCH_WEIGHTS.metadataAddress });
            }
            if (containsTerm(loc.municipality, term)) {
                score += SEARCH_WEIGHTS.metadataCity;
                matches.push({ field: "metadata.location.municipality", value: loc.municipality, weight: SEARCH_WEIGHTS.metadataCity });
            }
        }

        // Amenities array
        if (meta.amenities && Array.isArray(meta.amenities)) {
            const amenityMatches = searchStringArray(meta.amenities, term);
            for (const match of amenityMatches) {
                score += SEARCH_WEIGHTS.metadataAmenity;
                matches.push({ field: "metadata.amenities", value: match, weight: SEARCH_WEIGHTS.metadataAmenity });
            }
        }

        // Facilities array
        if (meta.facilities && Array.isArray(meta.facilities)) {
            const facilityMatches = searchStringArray(meta.facilities, term);
            for (const match of facilityMatches) {
                score += SEARCH_WEIGHTS.metadataFacility;
                matches.push({ field: "metadata.facilities", value: match, weight: SEARCH_WEIGHTS.metadataFacility });
            }
        }

        // Rules array (search title and content)
        if (meta.rules && Array.isArray(meta.rules)) {
            for (const rule of meta.rules) {
                if (rule && containsTerm(rule.title, term)) {
                    score += SEARCH_WEIGHTS.metadataRuleTitle;
                    matches.push({ field: "metadata.rules.title", value: rule.title, weight: SEARCH_WEIGHTS.metadataRuleTitle });
                }
                if (rule && containsTerm(rule.content, term)) {
                    score += SEARCH_WEIGHTS.metadataOther;
                    matches.push({ field: "metadata.rules.content", value: rule.content, weight: SEARCH_WEIGHTS.metadataOther });
                }
            }
        }

        // FAQ array (search question and answer)
        if (meta.faq && Array.isArray(meta.faq)) {
            for (const item of meta.faq) {
                if (item && containsTerm(item.question, term)) {
                    score += SEARCH_WEIGHTS.metadataFaqQuestion;
                    matches.push({ field: "metadata.faq.question", value: item.question, weight: SEARCH_WEIGHTS.metadataFaqQuestion });
                }
                if (item && containsTerm(item.answer, term)) {
                    score += SEARCH_WEIGHTS.metadataOther;
                    matches.push({ field: "metadata.faq.answer", value: item.answer, weight: SEARCH_WEIGHTS.metadataOther });
                }
            }
        }

        // Contact info
        if (containsTerm(meta.contactName, term)) {
            score += SEARCH_WEIGHTS.metadataContact;
            matches.push({ field: "metadata.contactName", value: meta.contactName, weight: SEARCH_WEIGHTS.metadataContact });
        }
        if (containsTerm(meta.contactEmail, term)) {
            score += SEARCH_WEIGHTS.metadataContact;
            matches.push({ field: "metadata.contactEmail", value: meta.contactEmail, weight: SEARCH_WEIGHTS.metadataContact });
        }
        if (containsTerm(meta.contactPhone, term)) {
            score += SEARCH_WEIGHTS.metadataContact;
            matches.push({ field: "metadata.contactPhone", value: meta.contactPhone, weight: SEARCH_WEIGHTS.metadataContact });
        }

        // Events array
        if (meta.events && Array.isArray(meta.events)) {
            for (const event of meta.events) {
                if (event && containsTerm(event.title, term)) {
                    score += SEARCH_WEIGHTS.metadataEvent;
                    matches.push({ field: "metadata.events.title", value: event.title, weight: SEARCH_WEIGHTS.metadataEvent });
                }
                if (event && containsTerm(event.description, term)) {
                    score += SEARCH_WEIGHTS.metadataOther;
                    matches.push({ field: "metadata.events.description", value: event.description, weight: SEARCH_WEIGHTS.metadataOther });
                }
                if (event && containsTerm(event.organizer, term)) {
                    score += SEARCH_WEIGHTS.metadataContact;
                    matches.push({ field: "metadata.events.organizer", value: event.organizer, weight: SEARCH_WEIGHTS.metadataContact });
                }
            }
        }

        // Generic metadata string fields search
        const searchedFields = new Set([
            "city", "address", "postalCode", "municipality", "location",
            "amenities", "facilities", "rules", "faq",
            "contactName", "contactEmail", "contactPhone", "contactWebsite",
            "events"
        ]);

        for (const [key, value] of Object.entries(meta)) {
            if (!searchedFields.has(key) && typeof value === "string" && containsTerm(value, term)) {
                score += SEARCH_WEIGHTS.metadataOther;
                matches.push({ field: `metadata.${key}`, value, weight: SEARCH_WEIGHTS.metadataOther });
            }
        }
    }

    // Boost score for multi-word queries if all terms match
    if (terms.length > 1) {
        const allTermsMatch = terms.every(t => {
            const nameMatch = containsTerm(resource.name, t);
            const descMatch = containsTerm(resource.description, t);
            const metaMatch = meta && JSON.stringify(meta).toLowerCase().includes(t);
            return nameMatch || descMatch || metaMatch;
        });
        if (allTermsMatch) {
            score *= 1.5; // 50% boost for matching all terms
        }
    }

    return { score, matches };
}

/**
 * Global search across resources - searches all fields and metadata
 * Supports single-character search with smart category suggestions
 */
export const globalSearch = query({
    args: {
        tenantId: v.id("tenants"),
        searchTerm: v.string(),
        categoryKey: v.optional(v.string()),
        subcategoryKey: v.optional(v.string()),
        status: v.optional(v.string()),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
        includeMetadata: v.optional(v.boolean()),
        includeCategorySuggestions: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const {
            tenantId,
            searchTerm,
            categoryKey,
            subcategoryKey,
            status,
            limit = 50,
            offset = 0,
            includeMetadata = false,
            includeCategorySuggestions = true,
        } = args;

        const term = searchTerm.toLowerCase().trim();
        const terms = term.split(/\s+/).filter(t => t.length >= 1);

        // Allow single character search
        if (term.length < 1) {
            return { results: [], total: 0, hasMore: false, categorySuggestions: [], intentSuggestions: [], popularSuggestions: [] };
        }

        // Get smart suggestions (categories, intents, popular) - same as public search
        const smartSuggestions = includeCategorySuggestions
            ? getSmartSuggestions(term)
            : { categories: [], intents: [], popular: [] };

        // Get all resources for the tenant from resources component
        let resources: any[] = await ctx.runQuery(
            components.resources.queries.list,
            { tenantId: tenantId as string }
        );

        // Filter by status (default to non-deleted)
        if (status) {
            resources = resources.filter((r: any) => r.status === status);
        } else {
            resources = resources.filter((r: any) => r.status !== "deleted");
        }

        // Filter by category if specified
        if (categoryKey) {
            resources = resources.filter((r: any) => r.categoryKey === categoryKey);
        }

        // Filter by subcategory if specified
        if (subcategoryKey) {
            resources = resources.filter((r: any) =>
                r.subcategoryKeys?.includes(subcategoryKey)
            );
        }

        // Calculate scores and find matches
        const scoredResults: SearchResultItem[] = [];

        for (const resource of resources) {
            const { score, matches } = calculateSearchScore(resource, term, terms);

            if (score > 0) {
                scoredResults.push({
                    id: resource._id,
                    name: resource.name,
                    slug: resource.slug,
                    description: resource.description,
                    categoryKey: resource.categoryKey,
                    subcategoryKeys: resource.subcategoryKeys,
                    status: resource.status,
                    images: resource.images,
                    score,
                    matches,
                    metadata: includeMetadata ? resource.metadata : undefined,
                });
            }
        }

        // Sort by score (highest first)
        scoredResults.sort((a, b) => b.score - a.score);

        // Apply pagination
        const total = scoredResults.length;
        const paginatedResults = scoredResults.slice(offset, offset + limit);
        const hasMore = offset + limit < total;

        // Add resource counts to category suggestions (tenant-scoped)
        const categorySuggestions = smartSuggestions.categories;
        if (includeCategorySuggestions && categorySuggestions.length > 0) {
            const categoryCounts: Record<string, number> = {};
            for (const r of scoredResults) {
                const key = (r as any).categoryKey;
                if (key) categoryCounts[key] = (categoryCounts[key] || 0) + 1;
            }
            for (const suggestion of categorySuggestions) {
                suggestion.resourceCount = categoryCounts[suggestion.key] || 0;
            }
        }

        return {
            results: paginatedResults,
            total,
            hasMore,
            categorySuggestions,
            intentSuggestions: smartSuggestions.intents,
            popularSuggestions: smartSuggestions.popular,
        };
    },
});

/**
 * Public global search - searches all published resources without requiring tenantId
 * Supports single-character search with smart category suggestions
 */
export const globalSearchPublic = query({
    args: {
        tenantId: v.optional(v.string()),
        searchTerm: v.string(),
        categoryKey: v.optional(v.string()),
        subcategoryKey: v.optional(v.string()),
        limit: v.optional(v.number()),
        offset: v.optional(v.number()),
        includeMetadata: v.optional(v.boolean()),
        includeCategorySuggestions: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const {
            tenantId,
            searchTerm,
            categoryKey,
            subcategoryKey,
            limit = 50,
            offset = 0,
            includeMetadata = false,
            includeCategorySuggestions = true,
        } = args;

        const term = searchTerm.toLowerCase().trim();
        const terms = term.split(/\s+/).filter(t => t.length >= 1);

        // Allow single character search
        if (term.length < 1) {
            return { results: [], total: 0, hasMore: false, categorySuggestions: [], intentSuggestions: [], popularSuggestions: [] };
        }

        // Get all smart suggestions (categories + intents + popular)
        const smartSuggestions = includeCategorySuggestions
            ? getSmartSuggestions(term)
            : { categories: [], intents: [], popular: [] };

        // Get all public resources (published) from resources component
        // Pass tenantId if available for tenant-scoped search
        let resources: any[] = await ctx.runQuery(
            components.resources.queries.listPublic,
            tenantId ? { tenantId } : {}
        );

        // Add resource counts to category suggestions
        if (includeCategorySuggestions && smartSuggestions.categories.length > 0) {
            const categoryCounts: Record<string, number> = {};
            for (const r of resources) {
                categoryCounts[r.categoryKey] = (categoryCounts[r.categoryKey] || 0) + 1;
            }
            for (const suggestion of smartSuggestions.categories) {
                suggestion.resourceCount = categoryCounts[suggestion.key] || 0;
            }
        }

        // Filter by category if specified
        if (categoryKey) {
            resources = resources.filter((r: any) => r.categoryKey === categoryKey);
        }

        // Filter by subcategory if specified
        if (subcategoryKey) {
            resources = resources.filter((r: any) =>
                r.subcategoryKeys?.includes(subcategoryKey)
            );
        }

        // Calculate scores and find matches
        const scoredResults: SearchResultItem[] = [];

        for (const resource of resources) {
            const { score, matches } = calculateSearchScore(resource, term, terms);

            if (score > 0) {
                scoredResults.push({
                    id: resource._id,
                    name: resource.name,
                    slug: resource.slug,
                    description: resource.description,
                    categoryKey: resource.categoryKey,
                    subcategoryKeys: resource.subcategoryKeys,
                    status: resource.status,
                    images: resource.images,
                    score,
                    matches,
                    metadata: includeMetadata ? resource.metadata : undefined,
                });
            }
        }

        // Sort by score (highest first)
        scoredResults.sort((a, b) => b.score - a.score);

        // Apply pagination
        const total = scoredResults.length;
        const paginatedResults = scoredResults.slice(offset, offset + limit);
        const hasMore = offset + limit < total;

        return {
            results: paginatedResults,
            total,
            hasMore,
            categorySuggestions: smartSuggestions.categories,
            intentSuggestions: smartSuggestions.intents,
            popularSuggestions: smartSuggestions.popular,
        };
    },
});

/**
 * Public typeahead - searches all published resources without requiring tenantId
 * Supports single-character search with fuzzy matching and category suggestions
 */
export const typeaheadPublic = query({
    args: {
        tenantId: v.optional(v.string()),
        prefix: v.string(),
        categoryKey: v.optional(v.string()),
        limit: v.optional(v.number()),
        includeCategorySuggestions: v.optional(v.boolean()),
    },
    handler: async (ctx, { tenantId, prefix, categoryKey, limit = 10, includeCategorySuggestions = true }) => {
        const term = prefix.toLowerCase().trim();

        if (term.length < 1) {
            return { suggestions: [], categorySuggestions: [] };
        }

        // Get smart category suggestions
        const categorySuggestions = includeCategorySuggestions
            ? getMatchingCategories(term).slice(0, 3)
            : [];

        // Get all public resources from resources component
        // Pass tenantId if available for tenant-scoped search
        let resources: any[] = await ctx.runQuery(
            components.resources.queries.listPublic,
            tenantId ? { tenantId } : {}
        );

        // Filter by category if specified
        if (categoryKey) {
            resources = resources.filter((r: any) => r.categoryKey === categoryKey);
        }

        // Score and filter matches with fuzzy matching
        const matches = resources
            .map((r: any) => {
                let score = 0;
                let matchType = "";
                const normalizedName = normalizeNorwegian(r.name.toLowerCase());
                const normalizedTerm = normalizeNorwegian(term);

                // Exact name start (highest priority)
                if (normalizedName.startsWith(normalizedTerm)) {
                    score = 100;
                    matchType = "name_start";
                }
                // Word boundary match in name
                else if (matchesAtWordBoundary(r.name, term)) {
                    score = 85;
                    matchType = "word_boundary";
                }
                // Slug starts with term
                else if (normalizeNorwegian(r.slug.toLowerCase()).startsWith(normalizedTerm)) {
                    score = 80;
                    matchType = "slug_start";
                }
                // Name contains term
                else if (normalizedName.includes(normalizedTerm)) {
                    score = 60;
                    matchType = "name_contains";
                }
                // Category key matches
                else if (r.categoryKey?.toLowerCase().includes(term)) {
                    score = 40;
                    matchType = "category";
                }
                // Fuzzy match on name
                else if (isFuzzyMatch(r.name, term)) {
                    score = 35;
                    matchType = "fuzzy_name";
                }

                // City/location-based matching
                const meta = r.metadata as any;
                const location = r.location as any;
                const cityCandidate =
                    location?.city ??
                    location?.municipality ??
                    meta?.city ??
                    meta?.location?.city ??
                    meta?.location?.municipality;
                const addressCandidate =
                    location?.address ??
                    meta?.address ??
                    meta?.location?.address;

                if (cityCandidate) {
                    const normalizedCity = normalizeNorwegian(String(cityCandidate).toLowerCase());
                    if (normalizedCity.startsWith(normalizedTerm)) {
                        score = Math.max(score, 55);
                        matchType = matchType || "city_start";
                    } else if (normalizedCity.includes(normalizedTerm)) {
                        score = Math.max(score, 45);
                        matchType = matchType || "city_contains";
                    } else if (isFuzzyMatch(String(cityCandidate), term)) {
                        score = Math.max(score, 30);
                        matchType = matchType || "city_fuzzy";
                    }
                }
                if (addressCandidate) {
                    const normalizedAddress = normalizeNorwegian(String(addressCandidate).toLowerCase());
                    if (normalizedAddress.startsWith(normalizedTerm)) {
                        score = Math.max(score, 50);
                        matchType = matchType || "address_start";
                    } else if (normalizedAddress.includes(normalizedTerm)) {
                        score = Math.max(score, 42);
                        matchType = matchType || "address_contains";
                    }
                }

                // Subcategory matching
                if (r.subcategoryKeys) {
                    for (const subcat of r.subcategoryKeys) {
                        if (normalizeNorwegian(subcat.toLowerCase()).includes(normalizedTerm)) {
                            score = Math.max(score, 42);
                            matchType = matchType || "subcategory";
                            break;
                        }
                    }
                }

                return { resource: r, score, matchType };
            })
            .filter((item: any) => item.score > 0)
            .sort((a: any, b: any) => b.score - a.score || a.resource.name.localeCompare(b.resource.name));

        const suggestions = matches.slice(0, limit).map(({ resource: r, score, matchType }: any) => ({
            id: r._id,
            name: r.name,
            slug: r.slug,
            categoryKey: r.categoryKey,
            subcategoryKeys: r.subcategoryKeys,
            city: (r.location as any)?.city
                ?? (r.location as any)?.municipality
                ?? (r.metadata as any)?.city
                ?? (r.metadata as any)?.location?.city
                ?? (r.metadata as any)?.location?.municipality,
            score,
            matchType,
        }));

        return { suggestions, categorySuggestions };
    },
});

/**
 * Typeahead / prefix search for quick lookup
 */
export const typeahead = query({
    args: {
        tenantId: v.id("tenants"),
        prefix: v.string(),
        categoryKey: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, prefix, categoryKey, limit = 10 }) => {
        const term = prefix.toLowerCase().trim();

        if (term.length < 1) {
            return [];
        }

        // Get all resources for the tenant from resources component
        let resources: any[] = await ctx.runQuery(
            components.resources.queries.list,
            { tenantId: tenantId as string }
        );

        // Filter to non-deleted
        resources = resources.filter((r: any) => r.status !== "deleted");

        // Filter by category if specified
        if (categoryKey) {
            resources = resources.filter((r: any) => r.categoryKey === categoryKey);
        }

        // Score and filter matches
        const matches = resources
            .map((r: any) => {
                let score = 0;
                if (r.name.toLowerCase().startsWith(term)) {
                    score = 100;
                } else if (r.slug.toLowerCase().startsWith(term)) {
                    score = 80;
                } else if (r.name.toLowerCase().includes(term)) {
                    score = 60;
                } else if (r.categoryKey?.toLowerCase().includes(term)) {
                    score = 40;
                }
                // Check metadata city for location-based typeahead
                const meta = r.metadata as any;
                if (meta?.city?.toLowerCase().startsWith(term)) {
                    score = Math.max(score, 50);
                }
                return { resource: r, score };
            })
            .filter((item: any) => item.score > 0)
            .sort((a: any, b: any) => b.score - a.score || a.resource.name.localeCompare(b.resource.name));

        return matches.slice(0, limit).map(({ resource: r, score }: any) => ({
            id: r._id,
            name: r.name,
            slug: r.slug,
            categoryKey: r.categoryKey,
            subcategoryKeys: r.subcategoryKeys,
            city: (r.metadata as any)?.city,
            score,
        }));
    },
});

/**
 * Search suggestions - returns popular/recent search terms
 */
export const searchSuggestions = query({
    args: {
        tenantId: v.id("tenants"),
        prefix: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { tenantId, prefix, limit = 8 }) => {
        // Get resources from the resources component
        const resources: any[] = await ctx.runQuery(
            components.resources.queries.list,
            { tenantId: tenantId as string }
        );

        const categories = new Set<string>();
        const subcategories = new Set<string>();
        const cities = new Set<string>();

        for (const r of resources) {
            if (r.status !== "deleted") {
                categories.add(r.categoryKey);
                r.subcategoryKeys?.forEach((s: string) => subcategories.add(s));
                const meta = r.metadata as any;
                if (meta?.city) cities.add(meta.city);
            }
        }

        let suggestions = [
            ...Array.from(categories).map(c => ({ type: "category", value: c })),
            ...Array.from(subcategories).map(s => ({ type: "subcategory", value: s })),
            ...Array.from(cities).map(c => ({ type: "city", value: c })),
        ];

        // Filter by prefix if provided
        if (prefix && prefix.length > 0) {
            const term = prefix.toLowerCase();
            suggestions = suggestions.filter(s =>
                s.value.toLowerCase().includes(term)
            );
        }

        return suggestions.slice(0, limit);
    },
});

/**
 * Faceted search - returns aggregated counts by category, subcategory, city
 */
export const searchFacets = query({
    args: {
        tenantId: v.id("tenants"),
        searchTerm: v.optional(v.string()),
        status: v.optional(v.string()),
    },
    handler: async (ctx, { tenantId, searchTerm, status }) => {
        // Get resources from the resources component
        let resources: any[] = await ctx.runQuery(
            components.resources.queries.list,
            { tenantId: tenantId as string }
        );

        // Filter by status
        if (status) {
            resources = resources.filter((r: any) => r.status === status);
        } else {
            resources = resources.filter((r: any) => r.status !== "deleted");
        }

        // Filter by search term if provided
        if (searchTerm && searchTerm.trim().length >= 2) {
            const term = searchTerm.toLowerCase().trim();
            const terms = term.split(/\s+/).filter(t => t.length >= 2);
            resources = resources.filter((r: any) => {
                const { score } = calculateSearchScore(r, term, terms);
                return score > 0;
            });
        }

        // Aggregate facets
        const categoryFacets: Record<string, number> = {};
        const subcategoryFacets: Record<string, number> = {};
        const cityFacets: Record<string, number> = {};
        const statusFacets: Record<string, number> = {};

        for (const r of resources) {
            // Categories
            categoryFacets[r.categoryKey] = (categoryFacets[r.categoryKey] || 0) + 1;

            // Subcategories
            r.subcategoryKeys?.forEach((s: string) => {
                subcategoryFacets[s] = (subcategoryFacets[s] || 0) + 1;
            });

            // Cities
            const meta = r.metadata as any;
            if (meta?.city) {
                cityFacets[meta.city] = (cityFacets[meta.city] || 0) + 1;
            }

            // Status
            statusFacets[r.status] = (statusFacets[r.status] || 0) + 1;
        }

        return {
            total: resources.length,
            categories: Object.entries(categoryFacets)
                .map(([key, count]) => ({ key, count }))
                .sort((a, b) => b.count - a.count),
            subcategories: Object.entries(subcategoryFacets)
                .map(([key, count]) => ({ key, count }))
                .sort((a, b) => b.count - a.count),
            cities: Object.entries(cityFacets)
                .map(([key, count]) => ({ key, count }))
                .sort((a, b) => b.count - a.count),
            statuses: Object.entries(statusFacets)
                .map(([key, count]) => ({ key, count }))
                .sort((a, b) => b.count - a.count),
        };
    },
});
