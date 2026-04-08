/**
 * Listing Filter Component
 *
 * Two-row filter layout:
 *   Row 1: Location dropdown + Category PillTabs + Favorites + View Toggle
 *   Row 2: Lightweight inline filter dropdowns (sort, subcategory, facilities, venue, month, capacity)
 *
 * Uses Designsystemet primitives for consistent styling.
 */

import React, { forwardRef, useState, useCallback, useMemo, useRef } from 'react';
import { GridIcon, ListIcon, MapIcon, TableIcon, FilterIcon, MapPinIcon, UsersIcon, CalendarIcon, BuildingIcon, TagIcon, SlidersIcon, SortIcon, HeartIcon, LayoutGridIcon } from '../primitives/icons';
import { cn } from '../utils';
import { PillTabs } from './PillTabs';
import { PillDropdown } from './PillDropdown';
import s from './listing-filter.module.css';

// =============================================================================
// Facility Icon Mapping
// =============================================================================

/** Map catalog category icon name strings to DS icon components */
const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
    grid: GridIcon,
    calendar: CalendarIcon,
    building: BuildingIcon,
    filter: FilterIcon,
    list: ListIcon,
    map: MapIcon,
    users: UsersIcon,
    tag: TagIcon,
    sliders: SlidersIcon,
};

/** Convert a category icon (string name or ReactNode) to a ReactNode */
function resolveCategoryIcon(icon?: string | React.ReactNode, size = 16): React.ReactNode {
    if (!icon) return null;
    if (typeof icon !== 'string') return icon; // Already a ReactNode
    const IconComponent = CATEGORY_ICON_MAP[icon.toLowerCase()];
    if (IconComponent) return <IconComponent size={size} />;
    return null;
}

// =============================================================================
// Types
// =============================================================================

export interface CategoryOption {
    id: string;
    key: string;
    label: string;
    icon?: string | React.ReactNode;
    count?: number;
    color?: string;
    colorDark?: string;
}

export interface SubcategoryOption {
    id: string;
    key: string;
    label: string;
    parentKey: string;
    icon?: string;
}

export interface FacilityOption {
    id: string;
    key: string;
    label: string;
    icon?: string;
}

export interface VenueOption {
    id: string;
    key: string;
    label: string;
    icon?: string;
}

export interface SortOption {
    id: string;
    label: string;
    field: string;
    order: 'asc' | 'desc';
}

export interface CityOption {
    name: string;
    count: number;
}

export interface ListingFilterState {
    category?: string;
    subcategories?: string[];
    facilities?: string[];
    venue?: string;
    month?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    minCapacity?: number;
    date?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    newThisWeek?: boolean;
    requiresApproval?: boolean;
    cateringAvailable?: boolean;
}

export interface ListingFilterLabels {
    /** Label for "All locations" option in dropdown */
    allLocations?: string;
    /** Placeholder for location search input */
    searchLocationPlaceholder?: string;
    /** Label shown when no search results */
    noResults?: string;
    /** Filter button label */
    filter?: string;
    /** New this week toggle label */
    newThisWeek?: string;
    /** Max price label */
    maxPrice?: string;
    /** Min capacity label */
    minCapacity?: string;
    /** Sort by label */
    sortBy?: string;
    /** Facilities section label */
    facilities?: string;
    /** Venues section label (when venues replace facilities) */
    venues?: string;
    /** Month filter label */
    month?: string;
    /** Clear all filters button */
    clearAll?: string;
    /** Location chip prefix */
    locationPrefix?: string;
    /** Max price chip prefix */
    maxPricePrefix?: string;
    /** Min capacity chip suffix */
    minCapacitySuffix?: string;
    /** Subcategory dropdown label */
    subcategory?: string;
    /** View mode labels */
    viewModes?: {
        grid?: string;
        list?: string;
        split?: string;
        map?: string;
        table?: string;
    };
    /** Empty state labels */
    emptyState?: {
        /** Title when no results */
        title?: string;
        /** Description when no results */
        description?: string;
        /** Clear filters button text */
        clearFilters?: string;
    };
}

export interface ListingFilterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /** Current filter state */
    value: ListingFilterState;

    /** Filter change handler */
    onChange: (filters: ListingFilterState) => void;

    /** Category options with counts (excluding 'Alle') */
    categories: CategoryOption[];

    /** Subcategory options (filtered by selected category) */
    subcategories?: SubcategoryOption[];

    /** Facility/amenity options */
    facilities?: FacilityOption[];

    /** Venue options (replaces facilities column when provided) */
    venues?: VenueOption[];

    /** Sort options */
    sortOptions?: SortOption[];

    /** City options with listing counts for autocomplete */
    cities?: CityOption[];

    /** Maximum price for slider */
    maxPriceLimit?: number;

    /** View mode */
    viewMode?: 'grid' | 'list' | 'map' | 'table' | 'split';

    /** View mode change handler */
    onViewModeChange?: (mode: 'grid' | 'list' | 'map' | 'table' | 'split') => void;

    /** Available view modes */
    availableViews?: Array<'grid' | 'list' | 'map' | 'table' | 'split'>;

    /** Total results count */
    resultsCount?: number;

    /** Results label */
    resultsLabel?: string;

    /** Show location dropdown (default: true). Set to false for single-venue tenants. */
    showLocation?: boolean;

    /** Show capacity dropdown (default: true) */
    showCapacity?: boolean;

    /** Show month dropdown (default: true) */
    showMonth?: boolean;

    /** Loading state */
    isLoading?: boolean;

    /** Compact mode (mobile) */
    compact?: boolean;

    /** Localized labels for UI text */
    labels?: ListingFilterLabels;

    /** Optional content to render after the tabs (e.g. action button) */
    afterTabs?: React.ReactNode;

    /** Favorites count for heart badge button */
    favoriteCount?: number;

    /** Whether favorites filter is currently active */
    isFavoriteActive?: boolean;

    /** Toggle favorites filter */
    onFavoriteToggle?: () => void;
}

// =============================================================================
// Default Options
// =============================================================================

const MONTHS = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember',
];

const CAPACITY_OPTIONS = [10, 20, 50, 100, 150, 200, 300, 500];

const DEFAULT_SORT_OPTIONS: SortOption[] = [
    { id: 'relevant', label: 'Mest relevant', field: 'relevance', order: 'desc' },
    { id: 'price-asc', label: 'Pris: Lav til høy', field: 'price', order: 'asc' },
    { id: 'price-desc', label: 'Pris: Høy til lav', field: 'price', order: 'desc' },
    { id: 'name-asc', label: 'Navn: A-Å', field: 'name', order: 'asc' },
    { id: 'newest', label: 'Nyeste først', field: 'createdAt', order: 'desc' },
];

const DEFAULT_LABELS: Required<ListingFilterLabels> = {
    allLocations: 'Alle steder',
    searchLocationPlaceholder: 'Søk sted...',
    noResults: 'No results',
    filter: 'Flere filtre',
    newThisWeek: 'New this week',
    maxPrice: 'Max price',
    minCapacity: 'Kapasitet',
    sortBy: 'Sorter',
    facilities: 'Fasiliteter',
    venues: 'Scene',
    month: 'Måned',
    clearAll: 'Nullstill alle',
    locationPrefix: 'Location:',
    maxPricePrefix: 'Max',
    minCapacitySuffix: 'personer',
    subcategory: 'Underkategori',
    viewModes: {
        grid: 'Grid',
        list: 'List',
        map: 'Map',
        table: 'Table',
    },
    emptyState: {
        title: 'No results found',
        description: 'Try adjusting your filters or search criteria to find what you\'re looking for.',
        clearFilters: 'Clear all filters',
    },
};

// =============================================================================
// Component
// =============================================================================

export const ListingFilter = forwardRef<HTMLDivElement, ListingFilterProps>(
    ({
        value,
        onChange,
        categories,
        subcategories = [],
        facilities = [],
        venues = [],
        sortOptions = DEFAULT_SORT_OPTIONS,
        cities = [],
        viewMode = 'grid',
        onViewModeChange,
        availableViews = ['grid', 'list', 'map', 'table'],
        resultsCount,
        resultsLabel = 'results',
        showLocation = true,
        showCapacity = true,
        showMonth = true,
        compact = false,
        labels,
        maxPriceLimit: _maxPriceLimit,
        isLoading: _isLoading,
        className,
        style,
        afterTabs,
        favoriteCount,
        isFavoriteActive,
        onFavoriteToggle,
        ...props
    }, ref) => {
        // Merge labels with defaults
        const t = useMemo(() => ({
            ...DEFAULT_LABELS,
            ...labels,
            viewModes: { ...DEFAULT_LABELS.viewModes, ...labels?.viewModes },
            emptyState: { ...DEFAULT_LABELS.emptyState, ...labels?.emptyState },
        }), [labels]);

        // Sync locationInput when value.location changes externally (e.g. clear all)
        const [, setLocationInput] = useState(value.location ?? '');
        React.useEffect(() => {
            setLocationInput(value.location ?? '');
        }, [value.location]);

        // Keep a ref to the current value to avoid stale closures in callbacks
        const valueRef = useRef(value);
        valueRef.current = value;

        // Filter out 'ALL' category
        const displayCategories = useMemo(() =>
            categories.filter(c => c.key !== 'ALL'),
            [categories]
        );

        // Build active filter chips (used for mobile filter badge count)
        const activeFilterCount = useMemo(() => {
            let count = 0;
            if (value.subcategories && value.subcategories.length > 0) count += value.subcategories.length;
            if (value.location) count++;
            if (value.minCapacity && value.minCapacity > 0) count++;
            if (value.facilities && value.facilities.length > 0) count += value.facilities.length;
            if (value.venue) count++;
            if (value.month) count++;
            if (value.sortBy && value.sortBy !== 'relevance') count++;
            return count;
        }, [value]);

        // Handlers
        const handleCategoryChange = useCallback((categoryKey: string) => {
            const newCategory = value.category === categoryKey ? undefined : categoryKey;
            onChange({
                ...value,
                category: newCategory,
                subcategories: undefined,
            });
        }, [value, onChange]);

        // Handler for smart location dropdown (PillDropdown)
        const handleLocationChange = useCallback((locationValue: string) => {
            if (locationValue === '') {
                setLocationInput('');
                onChange({ ...value, location: undefined });
            } else {
                setLocationInput(locationValue);
                onChange({ ...value, location: locationValue });
            }
        }, [value, onChange]);

        const handleSortChange = useCallback((sortId: string) => {
            const option = sortOptions.find(o => o.id === sortId);
            if (option) {
                onChange({ ...value, sortBy: option.field, sortOrder: option.order });
            }
        }, [value, onChange, sortOptions]);

        const handleSubcategoryChange = useCallback((keys: string[]) => {
            onChange({ ...value, subcategories: keys.length > 0 ? keys : undefined });
        }, [value, onChange]);

        const handleFacilityChange = useCallback((keys: string[]) => {
            onChange({ ...value, facilities: keys.length > 0 ? keys : undefined });
        }, [value, onChange]);

        const handleVenueChange = useCallback((venueKey: string) => {
            const newVenue = venueKey === '' ? undefined : (value.venue === venueKey ? undefined : venueKey);
            onChange({ ...value, venue: newVenue });
        }, [value, onChange]);

        const handleMonthChange = useCallback((monthValue: string) => {
            onChange({ ...value, month: monthValue === '' ? undefined : monthValue });
        }, [value, onChange]);

        const handleCapacityChange = useCallback((capValue: string) => {
            onChange({ ...value, minCapacity: capValue ? Number(capValue) : undefined });
        }, [value, onChange]);

        const currentSortId = sortOptions.find(
            o => o.field === value.sortBy && o.order === value.sortOrder
        )?.id ?? 'relevant';

        // View mode icons
        const viewIcons: Record<string, React.ReactNode> = {
            grid: <GridIcon size={20} />,
            list: <ListIcon size={20} />,
            split: <LayoutGridIcon size={20} />,
            map: <MapIcon size={20} />,
            table: <TableIcon size={20} />,
        };

        const viewLabels: Record<string, string> = {
            grid: t.viewModes.grid ?? 'Grid',
            list: t.viewModes.list ?? 'List',
            split: t.viewModes.split ?? 'Kart + Grid',
            map: t.viewModes.map ?? 'Map',
            table: t.viewModes.table ?? 'Table',
        };

        // Show venues dropdown (single-select) when venues are available (ARRANGEMENTER)
        // Show facilities dropdown (multiselect) when no venues but facilities available (LOKALER)
        const showVenueDropdown = venues.length > 0;
        const showFacilityDropdown = !showVenueDropdown && facilities.length > 0;

        // Whether the filter row has any dropdowns to show
        const hasFilterDropdowns = subcategories.length > 0 || showFacilityDropdown || showVenueDropdown || showMonth || showCapacity;

        // Build active filter chips for display + individual removal
        const activeFilters = useMemo(() => {
            const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

            if (value.location) {
                chips.push({
                    key: 'location',
                    label: `${t.locationPrefix} ${value.location}`,
                    onRemove: () => onChange({ ...value, location: undefined }),
                });
            }
            if (value.subcategories && value.subcategories.length > 0) {
                for (const subKey of value.subcategories) {
                    const sub = subcategories.find(s2 => s2.key === subKey);
                    if (sub) {
                        chips.push({
                            key: `sub-${subKey}`,
                            label: sub.label,
                            onRemove: () => onChange({
                                ...valueRef.current,
                                subcategories: (valueRef.current.subcategories ?? []).filter(k => k !== subKey),
                            }),
                        });
                    }
                }
            }
            if (value.facilities && value.facilities.length > 0) {
                for (const facKey of value.facilities) {
                    const fac = facilities.find(f => f.key === facKey);
                    if (fac) {
                        chips.push({
                            key: `fac-${facKey}`,
                            label: fac.label,
                            onRemove: () => onChange({
                                ...valueRef.current,
                                facilities: (valueRef.current.facilities ?? []).filter(k => k !== facKey),
                            }),
                        });
                    }
                }
            }
            if (value.venue) {
                const ven = venues.find(v2 => v2.key === value.venue);
                chips.push({
                    key: 'venue',
                    label: ven?.label ?? value.venue,
                    onRemove: () => onChange({ ...value, venue: undefined }),
                });
            }
            if (value.month) {
                chips.push({
                    key: 'month',
                    label: value.month,
                    onRemove: () => onChange({ ...value, month: undefined }),
                });
            }
            if (value.minCapacity && value.minCapacity > 0) {
                chips.push({
                    key: 'capacity',
                    label: `${value.minCapacity}+ ${t.minCapacitySuffix}`,
                    onRemove: () => onChange({ ...value, minCapacity: undefined }),
                });
            }
            return chips;
        }, [value, subcategories, facilities, venues, t, onChange]);

        const handleClearAll = useCallback(() => {
            onChange({
                ...value,
                subcategories: undefined,
                facilities: undefined,
                venue: undefined,
                month: undefined,
                minCapacity: undefined,
                location: undefined,
            });
        }, [value, onChange]);

        return (
            <div
                ref={ref}
                className={cn(className)}
                style={style}
                {...props}
            >
                {/* Row 1: [Category PillTabs] left | [Location + Sort + Favorites] center | [View toggle] right */}
                <div className={s.topRow}>
                    {/* Left Group: Category PillTabs */}
                    <div className={s.centerGroup}>
                        <PillTabs
                            tabs={displayCategories.map((cat) => ({
                                id: cat.key,
                                label: cat.label,
                                icon: resolveCategoryIcon(cat.icon),
                                badge: cat.count !== undefined ? String(cat.count) : undefined,
                                color: cat.color,
                                colorDark: cat.colorDark,
                            }))}
                            activeTab={value.category ?? ''}
                            onTabChange={(tabId) => handleCategoryChange(tabId)}
                            size="md"
                            ariaLabel="Kategorier"
                            allowDeselect
                            fullWidth={false}
                        />

                        {/* Content after tabs (e.g. extra actions) */}
                        {afterTabs && (
                            <div className={s.afterTabsWrapper}>
                                {afterTabs}
                            </div>
                        )}
                    </div>

                    {/* Middle Group: Location + Sort + Favorites */}
                    <div className={s.leftGroup}>
                        {showLocation && (
                        <PillDropdown
                            icon={<MapPinIcon size={16} />}
                            label={value.location || t.allLocations}
                            options={[
                                { value: '', label: t.allLocations },
                                ...cities.map(city => ({
                                    value: city.name,
                                    label: city.name,
                                    count: city.count,
                                })),
                            ]}
                            value={value.location || ''}
                            onChange={handleLocationChange}
                            ariaLabel={t.allLocations}
                            className={s.compactDropdown}
                            searchable
                            searchPlaceholder={t.searchLocationPlaceholder}
                            labels={{
                                noResults: t.noResults,
                                searchPlaceholder: t.searchLocationPlaceholder,
                            }}
                        />
                        )}

                        {sortOptions.length > 0 && (
                        <PillDropdown
                            icon={<SortIcon size={16} />}
                            label={sortOptions.find(o => o.id === currentSortId)?.label ?? t.sortBy}
                            options={sortOptions.map(o => ({ value: o.id, label: o.label }))}
                            value={currentSortId}
                            onChange={handleSortChange}
                            ariaLabel={t.sortBy}
                            className={s.compactDropdown}
                        />
                        )}

                        {onFavoriteToggle && (
                            <PillTabs
                                tabs={[{
                                    id: 'favorites',
                                    label: 'Favoritter',
                                    icon: <HeartIcon size={16} />,
                                    badge: (favoriteCount ?? 0) > 0 ? String(favoriteCount) : undefined,
                                }]}
                                activeTab={isFavoriteActive ? 'favorites' : ''}
                                onTabChange={() => onFavoriteToggle()}
                                size="md"
                                ariaLabel="Favoritter"
                                allowDeselect
                                fullWidth={false}
                            />
                        )}
                    </div>

                    {/* Right Group: View toggle + Mobile filter button */}
                    <div className={s.rightGroup}>
                        {onViewModeChange && (
                            <div className={s.viewToggle}>
                                {availableViews.map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => onViewModeChange(mode)}
                                        title={viewLabels[mode]}
                                        aria-label={viewLabels[mode]}
                                        aria-pressed={viewMode === mode}
                                        className={s.viewButton}
                                    >
                                        {viewIcons[mode]}
                                    </button>
                                ))}
                            </div>
                        )}
                        <button
                            type="button"
                            className={s.mobileFilterButton}
                            aria-label={t.filter}
                        >
                            <FilterIcon size={16} />
                            {t.filter}
                            {activeFilterCount > 0 && (
                                <span className={s.filterBadge}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Row 2: [Filter dropdowns] left | [View toggle] right */}
                <div className={s.filterRow}>
                    {/* Left: filter dropdowns */}
                    <div className={s.filterDropdowns}>
                        {/* Subcategory — multiselect, when subcategories available */}
                        {subcategories.length > 0 && (
                            <PillDropdown
                                variant="ghost"
                                multiselect
                                icon={<TagIcon size={16} />}
                                label={t.subcategory}
                                options={subcategories.map(sub => ({ value: sub.key, label: sub.label }))}
                                value={value.subcategories ?? []}
                                onChange={handleSubcategoryChange}
                                ariaLabel={t.subcategory}
                            />
                        )}

                        {/* Facilities — multiselect, when facilities available and no venues */}
                        {showFacilityDropdown && (
                            <PillDropdown
                                variant="ghost"
                                multiselect
                                icon={<SlidersIcon size={16} />}
                                label={t.facilities}
                                options={facilities.map(f => ({ value: f.key, label: f.label }))}
                                value={value.facilities ?? []}
                                onChange={handleFacilityChange}
                                ariaLabel={t.facilities}
                            />
                        )}

                        {/* Venue — single-select, when venues available (ARRANGEMENTER) */}
                        {showVenueDropdown && (
                            <PillDropdown
                                variant="ghost"
                                icon={<BuildingIcon size={16} />}
                                label={venues.find(v => v.key === value.venue)?.label ?? t.venues}
                                placeholder={t.venues}
                                options={[
                                    { value: '', label: `Alle ${t.venues.toLowerCase()}` },
                                    ...venues.map(v => ({ value: v.key, label: v.label })),
                                ]}
                                value={value.venue ?? ''}
                                onChange={handleVenueChange}
                                ariaLabel={t.venues}
                            />
                        )}

                        {/* Month — single-select */}
                        {showMonth && (
                            <PillDropdown
                                variant="ghost"
                                icon={<CalendarIcon size={16} />}
                                label={value.month ?? t.month}
                                placeholder={t.month}
                                options={[
                                    { value: '', label: `Alle måneder` },
                                    ...MONTHS.map(m => ({ value: m, label: m })),
                                ]}
                                value={value.month ?? ''}
                                onChange={handleMonthChange}
                                ariaLabel={t.month}
                            />
                        )}

                        {/* Capacity — single-select */}
                        {showCapacity && (
                            <PillDropdown
                                variant="ghost"
                                icon={<UsersIcon size={16} />}
                                label={value.minCapacity ? `${value.minCapacity}+ ${t.minCapacitySuffix}` : t.minCapacity}
                                placeholder={t.minCapacity}
                                options={[
                                    { value: '', label: t.minCapacity },
                                    ...CAPACITY_OPTIONS.map(n => ({ value: String(n), label: `${n}+ ${t.minCapacitySuffix}` })),
                                ]}
                                value={value.minCapacity ? String(value.minCapacity) : ''}
                                onChange={handleCapacityChange}
                                ariaLabel={t.minCapacity}
                            />
                        )}

                        {/* Active filter chips + Nullstill */}
                        {activeFilters.length > 0 && (
                            <>
                                <div className={s.filterDivider} />
                                <div className={s.activeChips}>
                                    {activeFilters.map(chip => (
                                        <span key={chip.key} className={s.chip}>
                                            {chip.label}
                                            <button
                                                type="button"
                                                className={s.chipRemove}
                                                onClick={chip.onRemove}
                                                aria-label={`Remove ${chip.label}`}
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                    <button
                                        type="button"
                                        className={s.clearAll}
                                        onClick={handleClearAll}
                                    >
                                        {t.clearAll}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>


                </div>
            </div>
        );
    }
);

ListingFilter.displayName = 'ListingFilter';
