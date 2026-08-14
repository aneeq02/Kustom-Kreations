/**
 * One-shot handoff for File objects selected in the /configure upload sheet,
 * consumed by /configure/single or /configure/tiled right after client-side
 * navigation. Module state survives a Next.js client-side route change (no
 * full reload), so this avoids round-tripping actual File objects through
 * the URL or storage.
 */

let pendingFiles: File[] | null = null;

export function setPendingFiles(files: File[]) {
  pendingFiles = files;
}

export function takePendingFiles(): File[] | null {
  const files = pendingFiles;
  pendingFiles = null;
  return files;
}
