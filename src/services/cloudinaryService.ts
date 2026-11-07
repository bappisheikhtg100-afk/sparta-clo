/**
 * Cloudinary Direct Upload Service for SPARTA Atelier Admin
 * Uses Web Crypto API for client-side SHA-1 signature calculation during admin sessions
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
  apiKey: (import.meta.env.VITE_CLOUDINARY_API_KEY as string) || '583185876679327',
  apiSecret: (import.meta.env.VITE_CLOUDINARY_API_SECRET as string) || 'ifySovr6bV2Z2-EqYxO2kGlVeyE',
  folder: 'sparta-atelier',
};

async function sha1Hex(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadToCloudinary(
  file: File | Blob,
  folder = CLOUDINARY_CONFIG.folder
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Signature string per Cloudinary rules: sorted params + secret
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
  const signature = await sha1Hex(stringToSign);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', timestamp);
  formData.append('folder', folder);
  formData.append('signature', signature);

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
 * Generates an optimized WebP thumbnail URL from any Cloudinary image link
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
