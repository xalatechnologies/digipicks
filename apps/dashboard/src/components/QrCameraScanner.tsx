/**
 * QrCameraScanner — Camera-based QR / barcode scanning via BarcodeDetector API.
 *
 * Uses the native BarcodeDetector when available (Chrome 83+, Edge, Samsung),
 * falls back to manual canvas scanning with jsQR if bundled.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { Button, Paragraph, CameraIcon, CloseIcon, Spinner } from '@digilist-saas/ds';
import { useT } from '@digilist-saas/i18n';

import styles from './QrCameraScanner.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QrCameraScannerProps {
  onScan: (barcode: string) => void;
  active: boolean;
  onToggle: () => void;
}

// BarcodeDetector type shim (not yet in lib.dom.d.ts)
declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
  static getSupportedFormats(): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QrCameraScanner({ onScan, active, onToggle }: QrCameraScannerProps) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number>(0);
  const lastScannedRef = useRef<string>('');

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Detect BarcodeDetector support
  const hasBarcodeDetector = typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis;

  // Start camera
  const startCamera = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('checkin.cameraError', 'Kunne ikke starte kamera')
      );
    } finally {
      setStarting(false);
    }
  }, [t]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    lastScannedRef.current = '';
  }, []);

  // Scan loop using BarcodeDetector
  const startScanLoop = useCallback(() => {
    if (!hasBarcodeDetector) return;

    const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'ean_8'] });

    const loop = async () => {
      if (!videoRef.current || !streamRef.current) return;

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          // Debounce: don't fire same barcode twice in rapid succession
          if (value && value !== lastScannedRef.current) {
            lastScannedRef.current = value;
            onScan(value);
            // Reset debounce after 3 seconds
            setTimeout(() => {
              if (lastScannedRef.current === value) {
                lastScannedRef.current = '';
              }
            }, 3000);
          }
        }
      } catch {
        // Detection errors are non-fatal, continue loop
      }

      scanLoopRef.current = requestAnimationFrame(loop);
    };

    scanLoopRef.current = requestAnimationFrame(loop);
  }, [hasBarcodeDetector, onScan]);

  // Canvas fallback scan loop (without jsQR — just captures frames for future use)
  const startCanvasFallbackLoop = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      if (!videoRef.current || !streamRef.current) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Canvas-based scanning requires jsQR which we don't bundle.
      // BarcodeDetector is the primary path.
      // This loop exists as a placeholder for future jsQR integration.

      scanLoopRef.current = requestAnimationFrame(loop);
    };

    scanLoopRef.current = requestAnimationFrame(loop);
  }, []);

  // Effect: start/stop camera based on active prop
  useEffect(() => {
    if (active) {
      startCamera().then(() => {
        if (hasBarcodeDetector) {
          startScanLoop();
        } else {
          startCanvasFallbackLoop();
        }
      });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [active, startCamera, stopCamera, startScanLoop, startCanvasFallbackLoop, hasBarcodeDetector]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!active) {
    return (
      <Button type="button" variant="secondary" data-size="sm" onClick={onToggle}>
        <CameraIcon size={16} />
        {t('checkin.cameraStart', 'Start kameraskanning')}
      </Button>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.viewport}>
        {starting && (
          <div className={styles.startPrompt}>
            <Spinner aria-label={t('checkin.cameraStarting', 'Starter kamera...')} data-size="md" />
          </div>
        )}
        <video ref={videoRef} className={styles.video} playsInline muted />
        <canvas ref={canvasRef} className={styles.canvas} />
        <div className={styles.overlay}>
          <div className={styles.scanRegion} />
        </div>
      </div>

      {error && (
        <Paragraph data-size="sm" style={{ color: 'var(--ds-color-danger-text-default)' }}>
          {error}
        </Paragraph>
      )}

      {!hasBarcodeDetector && !error && (
        <Paragraph data-size="xs" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          {t('checkin.cameraNoDetector', 'Kameraskanning krever Chrome 83+ eller en kompatibel nettleser.')}
        </Paragraph>
      )}

      <div className={styles.controls}>
        <Button type="button" variant="secondary" data-size="sm" onClick={onToggle}>
          <CloseIcon size={16} />
          {t('checkin.cameraStop', 'Stopp kameraskanning')}
        </Button>
      </div>
    </div>
  );
}
