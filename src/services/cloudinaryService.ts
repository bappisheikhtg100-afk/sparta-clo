/**
 * Production-Secure Cloudinary Direct Upload Service for SPARTA Atelier
 * ZERO API Secret exposed in client-side code.
 * Uses Cloudinary Unsigned Upload Presets for safe browser-to-cloud uploads.
 */

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export const CLOUDINARY_CONFIG = {
  cloudName: (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string) || 'zgk3djqr',
  uploadPreset: (import.meta.env.VITE_CLOUDINARY_PRESET as string) || 'sparta_unsigned',
  folder: 'sparta-atelier',
};

/**
 * Uploads an image directly to Cloudinary using an unsigned upload preset.
 * Safe for client-side execution in production.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  folder = CLOUDINARY_CONFIG.folder
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
  }

  const result: CloudinaryUploadResponse = await response.json();
  return result.secure_url;
}

/**
 * Generates an optimized WebP delivery URL with automatic format and quality transforms
 */
export function getOptimizedImageUrl(
  url: string,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  const { width = 800, quality = 85 } = options;
  return url.replace(
    /\/image\/upload\/(?:v\d+\/)?/,
    `/image/upload/w_${width},q_${quality},f_auto/`
  );
}
