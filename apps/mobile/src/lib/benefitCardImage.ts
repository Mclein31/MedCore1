export interface SelectedCardImage {
  base64?: string | null;
  mimeType?: string | null;
  fileSize?: number;
}

// Send only the user's selected bytes. Never substitute a sample image.
export function cardImageDataUri(asset: SelectedCardImage): string {
  if (!asset.base64?.trim())
    throw new Error('The selected image could not be read. Please choose another photo.');
  if ((asset.fileSize ?? 0) > 10 * 1024 * 1024 || asset.base64.length > 14 * 1024 * 1024) {
    throw new Error('Choose a card photo smaller than 10 MB.');
  }
  const mime = asset.base64.startsWith('/9j/')
    ? 'image/jpeg'
    : asset.base64.startsWith('iVBORw0KGgo')
      ? 'image/png'
      : asset.mimeType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mime)) {
    throw new Error('Choose a JPEG, PNG, WebP or HEIC card photo.');
  }
  return `data:${mime};base64,${asset.base64}`;
}
