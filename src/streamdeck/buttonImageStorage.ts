import RNFS from 'react-native-fs';

// Persistent home for button background images, inside this app's own
// document directory. Android's system Photo Picker hands back a
// `content://` URI that is NOT guaranteed to remain a stable, full-resolution
// reference across app restarts — after the process is killed and relaunched
// it can resolve to a downsampled preview/thumbnail instead of the original.
// Copying the picked file into our own storage immediately after picking
// gives us a local file we fully control.
const BUTTON_IMAGES_DIR = `${RNFS.DocumentDirectoryPath}/button-images`;

function toFileUri(path: string): string {
  // RNFS paths (and RNFS.DocumentDirectoryPath) are bare filesystem paths
  // with no scheme. RN's <Image> component needs a `file://` prefix to load
  // local paths on Android — bare paths silently fail to resolve. Guard
  // against double-prefixing in case a path is already file://-qualified.
  return path.startsWith('file://') ? path : `file://${path}`;
}

function stripFileUri(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

function guessExtension(sourceUri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(sourceUri);
  return match ? match[1] : 'jpg';
}

/**
 * Copies the image at `sourceUri` (typically a `content://` URI returned by
 * react-native-image-picker) into this app's own persistent storage, and
 * returns the resulting local `file://` path.
 *
 * RNFS.copyFile transparently supports `content://` sources on Android — its
 * own `stat()` docs describe resolving "Android Content URI" inputs, and
 * copyFile shares that same native file-access layer.
 *
 * Returns `null` (rather than throwing) on failure so callers can fall back
 * to the raw picker URI instead of losing the picked image entirely.
 */
export async function persistButtonImage(sourceUri: string, buttonId: string): Promise<string | null> {
  try {
    await RNFS.mkdir(BUTTON_IMAGES_DIR);
    const fileName = `${buttonId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${guessExtension(sourceUri)}`;
    const destPath = `${BUTTON_IMAGES_DIR}/${fileName}`;
    await RNFS.copyFile(sourceUri, destPath);
    return toFileUri(destPath);
  } catch (err) {
    console.warn('Failed to persist button image, falling back to picker uri', err);
    return null;
  }
}

/** True when `uri` points at a file this module previously persisted. */
export function isPersistedButtonImageUri(uri: string): boolean {
  return uri.includes('/button-images/');
}

/**
 * Deletes a previously persisted button image. Safe to call with any URI —
 * no-ops for anything not under our own `button-images/` folder, so it never
 * touches a raw picker URI or some other file. Failures are logged and
 * swallowed: an orphaned file on disk is not worth blocking a save over.
 */
export async function deletePersistedButtonImage(uri: string | null | undefined): Promise<void> {
  if (!uri || !isPersistedButtonImageUri(uri)) return;
  const path = stripFileUri(uri);
  try {
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
  } catch (err) {
    console.warn('Failed to delete old persisted button image', err);
  }
}
