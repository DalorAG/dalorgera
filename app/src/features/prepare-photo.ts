import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Long side in pixels: receipt text stays readable for people and for recognition. */
export const MAX_PHOTO_SIDE = 2000;
const JPEG_QUALITY = 0.8;

/**
 * Downscales a photo to MAX_PHOTO_SIDE and re-encodes it as JPEG
 * (a 12 MP camera photo goes from several MB to a few hundred KB, HEIC becomes JPEG).
 */
export async function preparePhoto(uri: string): Promise<{ uri: string; mimeType: 'image/jpeg' }> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const longSide = Math.max(original.width, original.height);
  const image =
    longSide > MAX_PHOTO_SIDE
      ? await ImageManipulator.manipulate(original)
          .resize(original.width >= original.height ? { width: MAX_PHOTO_SIDE } : { height: MAX_PHOTO_SIDE })
          .renderAsync()
      : original;
  const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return { uri: saved.uri, mimeType: 'image/jpeg' };
}
