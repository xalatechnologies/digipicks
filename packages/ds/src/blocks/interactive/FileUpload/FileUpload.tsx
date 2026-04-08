/**
 * FileUpload - Comprehensive file upload component
 *
 * Features:
 * - Drag-and-drop support
 * - File validation (type, size, count)
 * - Image previews
 * - Upload progress tracking
 * - Accessible (WCAG AA)
 * - Mobile responsive
 */

import * as React from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { cn } from '../../../utils';
import { CloseIcon } from '../../../primitives/icons';
import { useToast } from '../../feedback/Toast';
import styles from './FileUpload.module.css';

// Icons
const UploadIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const FileIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M13 2v7h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export interface UploadedFile {
    file: File;
    id: string;
    preview?: string;
    progress?: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

export interface UploadResult {
    success: boolean;
    fileId: string;
    url?: string;
    error?: string;
}

export interface FileUploadProps {
    // Core
    value?: File[];
    onChange?: (files: File[]) => void;
    onUpload?: (files: File[]) => Promise<UploadResult[]>;

    // Validation
    accept?: string;
    maxSize?: number; // in bytes
    maxFiles?: number;

    // Behavior
    multiple?: boolean;
    disabled?: boolean;

    // UI
    showPreviews?: boolean;
    showProgress?: boolean;

    // Styling
    variant?: 'default' | 'compact' | 'minimal';
    className?: string;

    // Accessibility
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

// Helper to format file size
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Helper to validate file
function validateFile(file: File, accept?: string, maxSize?: number): string | null {
    // Check file type
    if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const fileType = file.type;
        const fileExt = `.${file.name.split('.').pop()}`;

        const isAccepted = acceptedTypes.some((type) => {
            if (type.endsWith('/*')) {
                const category = type.split('/')[0];
                return fileType.startsWith(`${category}/`);
            }
            if (type.startsWith('.')) {
                return fileExt.toLowerCase() === type.toLowerCase();
            }
            return fileType === type;
        });

        if (!isAccepted) {
            return `Filtype ikke støttet. Aksepterte typer: ${accept}`;
        }
    }

    // Check file size
    if (maxSize && file.size > maxSize) {
        return `Filen er for stor. Maks størrelse: ${formatFileSize(maxSize)}`;
    }

    return null;
}

/**
 * FileUpload component with drag-and-drop
 */
export function FileUpload({
    // value,
    onChange,
    // onUpload,
    accept,
    maxSize,
    maxFiles = 10,
    multiple = true,
    disabled = false,
    showPreviews = true,
    showProgress = true,
    variant = 'default',
    className,
    ariaLabel = 'Last opp filer',
    ariaDescribedBy,
}: FileUploadProps): React.ReactElement {
    const { warning } = useToast();
    const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const dragCounterRef = React.useRef(0);

    // Generate preview for image files
    const generatePreview = React.useCallback((file: File): Promise<string | undefined> => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(undefined);
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.onerror = () => {
                resolve(undefined);
            };
            reader.readAsDataURL(file);
        });
    }, []);

    // Add files
    const addFiles = React.useCallback(
        async (files: FileList | File[]) => {
            const fileArray = Array.from(files);

            // Check max files
            if (uploadedFiles.length + fileArray.length > maxFiles) {
                warning(`Du kan maksimalt laste opp ${maxFiles} filer`);
                return;
            }

            // Validate and process files
            const newFiles: UploadedFile[] = [];

            for (const file of fileArray) {
                const error = validateFile(file, accept, maxSize);
                const preview = await generatePreview(file);

                newFiles.push({
                    file,
                    id: `${Date.now()}-${Math.random()}`,
                    preview,
                    status: error ? 'error' : 'pending',
                    error: error || undefined,
                });
            }

            const updatedFiles = [...uploadedFiles, ...newFiles];
            setUploadedFiles(updatedFiles);
            onChange?.(updatedFiles.filter((f) => !f.error).map((f) => f.file));
        },
        [uploadedFiles, maxFiles, accept, maxSize, onChange, generatePreview, warning]
    );

    // Remove file
    const removeFile = React.useCallback(
        (id: string) => {
            const updatedFiles = uploadedFiles.filter((f) => f.id !== id);
            setUploadedFiles(updatedFiles);
            onChange?.(updatedFiles.map((f) => f.file));
        },
        [uploadedFiles, onChange]
    );

    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
        }
        // Reset input value to allow selecting the same file again
        e.target.value = '';
    };

    // Handle drag events
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounterRef.current = 0;

        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    };

    // Handle click to browse
    const handleClick = () => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className={cn(styles.container, className)}>
            {/* Drop Zone */}
            <div
                className={cn(
                    styles.dropZone,
                    styles[`variant-${variant}`],
                    isDragging && styles.dragging,
                    disabled && styles.disabled
                )}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleClick}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className={styles.fileInput}
                    onChange={handleFileInputChange}
                    accept={accept}
                    multiple={multiple}
                    disabled={disabled}
                    aria-hidden="true"
                />

                <div className={styles.dropZoneContent}>
                    <UploadIcon size={variant === 'compact' ? 32 : 48} />
                    <div className={styles.dropZoneText}>
                        <Paragraph data-size="sm" className={styles.dropZoneTitle}>
                            {isDragging ? 'Slipp filene her' : 'Dra og slipp filer her'}
                        </Paragraph>
                        <Paragraph data-size="sm" className={styles.dropZoneSubtitle}>
                            eller <span className={styles.browseLink}>bla gjennom</span>
                        </Paragraph>
                        {(accept || maxSize) && (
                            <Paragraph data-size="xs" className={styles.dropZoneHint}>
                                {accept && <span>Aksepterte typer: {accept}</span>}
                                {accept && maxSize && <span> • </span>}
                                {maxSize && <span>Maks størrelse: {formatFileSize(maxSize)}</span>}
                            </Paragraph>
                        )}
                    </div>
                </div>
            </div>

            {/* File Previews */}
            {showPreviews && uploadedFiles.length > 0 && (
                <div className={styles.previews}>
                    {uploadedFiles.map((uploadedFile) => (
                        <div
                            key={uploadedFile.id}
                            className={cn(
                                styles.preview,
                                uploadedFile.status === 'error' && styles.previewError,
                                uploadedFile.status === 'success' && styles.previewSuccess
                            )}
                        >
                            {/* Preview Image or Icon */}
                            <div className={styles.previewImage}>
                                {uploadedFile.preview ? (
                                    <img src={uploadedFile.preview} alt={uploadedFile.file.name} />
                                ) : (
                                    <FileIcon size={32} />
                                )}
                            </div>

                            {/* File Info */}
                            <div className={styles.previewInfo}>
                                <Paragraph data-size="sm" className={styles.previewName} title={uploadedFile.file.name}>
                                    {uploadedFile.file.name}
                                </Paragraph>
                                <Paragraph data-size="xs" className={styles.previewSize}>{formatFileSize(uploadedFile.file.size)}</Paragraph>
                                {uploadedFile.error && <Paragraph data-size="xs" className={styles.previewErrorText}>{uploadedFile.error}</Paragraph>}
                            </div>

                            {/* Progress Bar */}
                            {showProgress && uploadedFile.status === 'uploading' && uploadedFile.progress !== undefined && (
                                <div className={styles.progressBar}>
                                    <div className={styles.progressFill} style={{ width: `${uploadedFile.progress}%` }} />
                                </div>
                            )}

                            {/* Remove Button */}
                            <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() => removeFile(uploadedFile.id)}
                                aria-label={`Fjern ${uploadedFile.file.name}`}
                            >
                                <CloseIcon size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FileUpload;
