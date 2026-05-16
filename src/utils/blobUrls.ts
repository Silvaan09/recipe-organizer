export function createBlobUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

export function revokeBlobUrl(url: string | undefined) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
