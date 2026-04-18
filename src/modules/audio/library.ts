import type { ChunkAudioRef } from "@/types";

const DEFAULT_BACKING_TRACKS: ChunkAudioRef[] = [
  {
    id: "instrumental-presence",
    title: "Presence",
    storageKey: "music/Instrumental Study Tracks/Presence.mp3",
    source: "Instrumental Study Tracks",
  },
  {
    id: "instrumental-stillness",
    title: "Stillness",
    storageKey: "music/Instrumental Study Tracks/Stillness.mp3",
    source: "Instrumental Study Tracks",
  },
];

export function getDefaultBackingTracks(): ChunkAudioRef[] {
  return DEFAULT_BACKING_TRACKS.map((track) => ({ ...track }));
}

export function getTrackTypeLabel(track: Pick<ChunkAudioRef, "storageKey">): string {
  const storageKey = `/${track.storageKey.trim().replace(/^\/+/, "")}`;

  if (storageKey.includes("/Instrumental Study Tracks/")) {
    return "Instrumental";
  }

  if (storageKey.includes("/music/")) {
    return "Vocals";
  }

  return "Track";
}

export function mergeTrackLibraries(
  defaultTracks: ChunkAudioRef[],
  chunkTracks: ChunkAudioRef[],
): ChunkAudioRef[] {
  const mergedTracks: ChunkAudioRef[] = [];
  const seenTrackIds = new Set<string>();

  for (const track of [...defaultTracks, ...chunkTracks]) {
    if (seenTrackIds.has(track.id)) {
      continue;
    }

    seenTrackIds.add(track.id);
    mergedTracks.push(track);
  }

  return mergedTracks;
}
