import type { ChunkAudioRef } from "@/types";

const resolvedTrackUrlCache = new Map<string, string>();

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

function encodeStoragePath(storageKey: string): string {
  return trimLeadingSlash(storageKey)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildSameOriginUrl(storageKey: string): string {
  return `/${encodeStoragePath(storageKey)}`;
}

export function resolveTrackUrl(track: ChunkAudioRef): string {
  const storageKey = track.storageKey.trim();
  const cachedUrl = resolvedTrackUrlCache.get(storageKey);

  if (cachedUrl) {
    return cachedUrl;
  }

  if (/^https?:\/\//i.test(storageKey)) {
    resolvedTrackUrlCache.set(storageKey, storageKey);
    return storageKey;
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_AUDIO_BASE_URL?.trim();
  const resolvedUrl = configuredBaseUrl
    ? `${trimTrailingSlash(configuredBaseUrl)}/${encodeStoragePath(storageKey)}`
    : buildSameOriginUrl(storageKey);

  resolvedTrackUrlCache.set(storageKey, resolvedUrl);
  return resolvedUrl;
}

export function clearResolvedTrackUrlCache(): void {
  resolvedTrackUrlCache.clear();
}
