import type { ChunkAudioRef } from "@/types";
import type { StudyStage } from "@/components/study/TextAnchor";

export function hasBackingTracks(tracks: ChunkAudioRef[]): boolean {
  return tracks.length > 0;
}

export function isSongEntryMode(
  requestedSongMode: boolean,
  tracks: ChunkAudioRef[],
): boolean {
  return requestedSongMode && hasBackingTracks(tracks);
}

export function shouldRenderAbideAudioPlayer(
  stage: StudyStage,
  tracks: ChunkAudioRef[],
): boolean {
  return stage === "soak" && hasBackingTracks(tracks);
}
