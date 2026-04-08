/**
 * DigilistSaaS SDK - File Upload Hook
 *
 * Uploads images to Convex file storage and returns public URLs.
 * Handles base64 data URI → compress → Blob → Convex storage → URL conversion.
 *
 * Uses the existing `storage.storeFile` mutation to resolve storage URLs
 * (it already returns { url } without side effects when no resourceId is given).
 */

import { useCallback } from "react";
import { useMutation } from "./convex-utils";
import { api } from "../convex-api";

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 0.82;
const MAX_BLOB_SIZE = 4 * 1024 * 1024; // 4 MB — stay under server limit

/**
 * Compress a base64 data URI image using canvas.
 * Returns a JPEG blob resized to fit within MAX_WIDTH x MAX_HEIGHT.
 */
function compressImage(dataUri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if larger than max dimensions
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob returned null"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUri;
  });
}

/**
 * Convert a base64 data URI to a Blob (no compression, used as fallback for non-image types).
 */
function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(",");
  const mime = header?.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = atob(base64 || "");
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

/** Check if a string is a base64 data URI */
export function isBase64DataUri(str: string): boolean {
  return typeof str === "string" && str.startsWith("data:");
}

/**
 * Hook that provides a function to upload base64 images to Convex file storage.
 *
 * @example
 * ```tsx
 * const { uploadBase64Image } = useFileUpload();
 * const url = await uploadBase64Image(base64DataUri);
 * ```
 */
export function useFileUpload(): {
  uploadBase64Image: (dataUri: string) => Promise<string>;
} {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const storeFile = useMutation(api.storage.storeFile);

  const uploadBase64Image = useCallback(
    async (dataUri: string): Promise<string> => {
      // Compress image to JPEG, resize if oversized
      let blob: Blob;
      const isImage = dataUri.startsWith("data:image/");
      if (isImage) {
        blob = await compressImage(dataUri);
        // If still too large after first pass, reduce quality further
        if (blob.size > MAX_BLOB_SIZE) {
          const canvas = document.createElement("canvas");
          const img = new Image();
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error("Image load failed"));
            img.src = dataUri;
          });
          let { width, height } = img;
          const ratio = Math.min(1280 / width, 1280 / height, 1);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          blob = await new Promise<Blob>((res, rej) =>
            canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.6),
          );
        }
      } else {
        blob = dataUriToBlob(dataUri);
      }

      // 1. Get a short-lived upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // 2. POST the blob to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const { storageId } = await response.json();

      // 3. Get the public URL via storeFile mutation (returns { url })
      // No resourceId = no side effects, just resolves the storage URL
      const result = await storeFile({
        storageId,
        filename: "image",
        contentType: blob.type,
        size: blob.size,
      });

      if (!result?.url) {
        throw new Error("Failed to get public URL for uploaded file");
      }

      return result.url;
    },
    [generateUploadUrl, storeFile],
  );

  return { uploadBase64Image };
}
