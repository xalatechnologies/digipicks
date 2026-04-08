/**
 * DataTable Component
 *
 * A generic, reusable data table with sorting, pagination, and row selection.
 * Built on Designsystemet Table primitive for consistent styling.
 *
 * @example Basic usage
 * ```tsx
 * const columns: DataTableColumn<User>[] = [
 *   { id: 'name', header: 'Name', accessor: 'name', sortable: true },
 *   { id: 'email', header: 'Email', accessor: 'email' },
 *   { id: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> },
 * ];
 *
 * <DataTable
 *   columns={columns}
 *   data={users}
 *   pagination={{ page: 1, pageSize: 10, total: 100 }}
 *   onPageChange={setPage}
 *   onSort={setSort}
 * />
 * ```
 */

import * as React from 'react';
import {
    Table,
    Checkbox,
    Spinner,
} from '@digdir/designsystemet-react';
import { Stack } from '../primitives';
import { cn } from '../utils';
import styles from './DataTable.module.css';

// =============================================================================
// Types
// =============================================================================

/** Column definition for DataTable */
export interface DataTableColumn<T> {
    /** Unique column identifier */
    id: string;
    /** Column header text */
    header: string;
    /** Property key to access value (for simple cases) */
    accessor?: keyof T;
    /** Custom render function for cell content */
    render?: (row: T, index: number) => React.ReactNode;
    /** Whether column is sortable */
    sortable?: boolean;
    /** Column width (CSS value) */
    width?: string;
    /** Text alignment */
    align?: 'left' | 'center' | 'right';
    /** Hide column on mobile */
    hideOnMobile?: boolean;
}

/** Sort state */
export interface SortState {
    column: string;
    direction: 'asc' | 'desc';
}

/** Pagination state */
export interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
}

/** DataTable props */
export interface DataTableProps<T> {
    /** Column definitions */
    columns: DataTableColumn<T>[];
    /** Data rows */
    data: T[];
    /** Unique key extractor for rows */
    getRowKey: (row: T, index: number) => string;
    /** Loading state */
    isLoading?: boolean;
    /** Empty state message */
    emptyMessage?: string;
    /** Current sort state */
    sort?: SortState;
    /** Sort change handler */
    onSort?: (sort: SortState) => void;
    /** Pagination state */
    pagination?: PaginationState;
    /** Page change handler */
    onPageChange?: (page: number) => void;
    /** Page size change handler */
    onPageSizeChange?: (pageSize: number) => void;
    /** Enable row selection */
    selectable?: boolean;
    /** Selected row keys */
    selectedRows?: string[];
    /** Selection change handler */
    onSelectionChange?: (selectedKeys: string[]) => void;
    /** Row click handler */
    onRowClick?: (row: T, index: number) => void;
    /** Custom class name */
    className?: string;
    /** Custom styles */
    style?: React.CSSProperties;
    /** Component size */
    size?: 'sm' | 'md' | 'lg';
    /** Zebra striping */
    zebra?: boolean;
    /** Sticky header */
    stickyHeader?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function DataTable<T>({
    columns,
    data,
    getRowKey,
    isLoading = false,
    emptyMessage = 'Ingen data å vise',
    sort,
    onSort,
    pagination,
    onPageChange,
    selectable = false,
    selectedRows = [],
    onSelectionChange,
    onRowClick,
    className,
    style,
    size = 'md',
    zebra = false,
    stickyHeader = false,
}: DataTableProps<T>): React.ReactElement {
    // Handle column header click for sorting
    const handleSort = (columnId: string) => {
        if (!onSort) return;

        const column = columns.find((c) => c.id === columnId);
        if (!column?.sortable) return;

        const newDirection =
            sort?.column === columnId && sort.direction === 'asc' ? 'desc' : 'asc';

        onSort({ column: columnId, direction: newDirection });
    };

    // Handle select all
    const handleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;

        if (checked) {
            const allKeys = data.map((row, index) => getRowKey(row, index));
            onSelectionChange(allKeys);
        } else {
            onSelectionChange([]);
        }
    };

    // Handle individual row selection
    const handleRowSelect = (rowKey: string, checked: boolean) => {
        if (!onSelectionChange) return;

        if (checked) {
            onSelectionChange([...selectedRows, rowKey]);
        } else {
            onSelectionChange(selectedRows.filter((key) => key !== rowKey));
        }
    };

    // Check if all rows are selected
    const allSelected = data.length > 0 && data.every((row, index) =>
        selectedRows.includes(getRowKey(row, index))
    );

    // Check if some rows are selected
    // const someSelected = selectedRows.length > 0 && !allSelected;

    // Get cell value for a column
    const getCellValue = (row: T, column: DataTableColumn<T>, index: number): React.ReactNode => {
        if (column.render) {
            return column.render(row, index);
        }
        if (column.accessor) {
            const value = row[column.accessor];
            return value != null ? String(value) : '';
        }
        return '';
    };

    // Render sort indicator
    const renderSortIndicator = (columnId: string) => {
        if (sort?.column !== columnId) {
            return <span className={styles.sortIndicatorInactive}>↕</span>;
        }
        return sort.direction === 'asc' ? '↑' : '↓';
    };

    const cellAlignClass = (align?: string) =>
        align === 'center' ? styles.cellCenter : align === 'right' ? styles.cellRight : styles.cellLeft;

    return (
        <Stack direction="vertical" spacing="var(--ds-size-4)" className={className} style={style}>
            <div className={styles.tableWrap}>
                <Table
                    data-size={size}
                    zebra={zebra}
                    stickyHeader={stickyHeader}
                >
                    <Table.Head>
                        <Table.Row>
                            {selectable && (
                                <Table.HeaderCell className={styles.selectCell}>
                                    <Checkbox
                                        checked={allSelected}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        aria-label="Velg alle rader"
                                        data-size="sm"
                                    />
                                </Table.HeaderCell>
                            )}

                            {/* Data columns */}
                            {columns.map((column) => (
                                <Table.HeaderCell
                                    key={column.id}
                                    className={cn(
                                        column.sortable ? styles.headerSortable : styles.headerDefault,
                                        cellAlignClass(column.align)
                                    )}
                                    style={column.width ? { width: column.width } : undefined}
                                    onClick={() => column.sortable && handleSort(column.id)}
                                    aria-sort={
                                        sort?.column === column.id
                                            ? sort.direction === 'asc'
                                                ? 'ascending'
                                                : 'descending'
                                            : undefined
                                    }
                                >
                                    <span className={styles.headerCellContent}>
                                        {column.header}
                                        {column.sortable && (
                                            <span className={styles.sortIndicator}>{renderSortIndicator(column.id)}</span>
                                        )}
                                    </span>
                                </Table.HeaderCell>
                            ))}
                        </Table.Row>
                    </Table.Head>

                    <Table.Body>
                        {/* Loading state */}
                        {isLoading && (
                            <Table.Row>
                                <Table.Cell
                                    colSpan={columns.length + (selectable ? 1 : 0)}
                                    className={styles.loadingCell}
                                >
                                    <Spinner aria-label="Laster data..." />
                                </Table.Cell>
                            </Table.Row>
                        )}

                        {!isLoading && data.length === 0 && (
                            <Table.Row>
                                <Table.Cell
                                    colSpan={columns.length + (selectable ? 1 : 0)}
                                    className={cn(styles.loadingCell, styles.emptyCell)}
                                >
                                    {emptyMessage}
                                </Table.Cell>
                            </Table.Row>
                        )}

                        {/* Data rows */}
                        {!isLoading &&
                            data.map((row, index) => {
                                const rowKey = getRowKey(row, index);
                                const isSelected = selectedRows.includes(rowKey);

                                return (
                                    <Table.Row
                                        key={rowKey}
                                        onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                                        className={cn(
                                            onRowClick && styles.rowClickable,
                                            isSelected && styles.rowSelected
                                        )}
                                        aria-selected={isSelected}
                                    >
                                        {selectable && (
                                            <Table.Cell>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onChange={(e) => handleRowSelect(rowKey, e.target.checked)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    aria-label={`Velg rad ${index + 1}`}
                                                    data-size="sm"
                                                />
                                            </Table.Cell>
                                        )}

                                        {columns.map((column) => (
                                            <Table.Cell
                                                key={column.id}
                                                className={cellAlignClass(column.align)}
                                            >
                                                {getCellValue(row, column, index)}
                                            </Table.Cell>
                                        ))}
                                    </Table.Row>
                                );
                            })}
                    </Table.Body>
                </Table>
            </div>

            {/* Pagination */}
            {pagination && onPageChange && (
                <div className={styles.pagination}>
                    <span className={styles.paginationInfo}>
                        Viser {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} -{' '}
                        {Math.min(pagination.page * pagination.pageSize, pagination.total)} av {pagination.total}
                    </span>

                    <div className={styles.paginationNav}>
                        <button
                            type="button"
                            className={styles.paginationButton}
                            onClick={() => onPageChange(1)}
                            disabled={pagination.page <= 1}
                        >
                            ⟨⟨
                        </button>
                        <button
                            type="button"
                            className={styles.paginationButton}
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                        >
                            ⟨
                        </button>
                        <span className={styles.paginationPageInfo}>
                            Side {pagination.page} av {Math.ceil(pagination.total / pagination.pageSize)}
                        </span>
                        <button
                            type="button"
                            className={styles.paginationButton}
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                        >
                            ⟩
                        </button>
                        <button
                            type="button"
                            className={styles.paginationButton}
                            onClick={() => onPageChange(Math.ceil(pagination.total / pagination.pageSize))}
                            disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                        >
                            ⟩⟩
                        </button>
                    </div>
                </div>
            )}
        </Stack>
    );
}

export default DataTable;
