/**
 * Upload progress tracking utilities
 *
 * Used by media upload components to track file upload/compression progress.
 */

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  estimatedTimeRemaining?: number;
}

export class UploadProgressTracker {
  private startTime: number | null = null;
  private lastLoaded = 0;
  private lastTime = 0;

  update(loaded: number, total: number): UploadProgressEvent {
    const now = Date.now();
    if (!this.startTime) {
      this.startTime = now;
      this.lastTime = now;
      this.lastLoaded = loaded;
    }

    const elapsed = (now - this.lastTime) / 1000;
    const speed = elapsed > 0 ? (loaded - this.lastLoaded) / elapsed : 0;
    const remaining = total - loaded;
    const estimatedTimeRemaining = speed > 0 ? remaining / speed : undefined;

    this.lastLoaded = loaded;
    this.lastTime = now;

    return {
      loaded,
      total,
      percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
      speed,
      estimatedTimeRemaining,
    };
  }

  reset(): void {
    this.startTime = null;
    this.lastLoaded = 0;
    this.lastTime = 0;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number | undefined): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '';
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatETA(seconds: number | undefined): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '';
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
