import type { ChunkAudioRef } from "@/types";
import type { StudyStage } from "@/components/study/TextAnchor";

export type AbideTextVisibility = "normal" | "dim" | "off";

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

export function cycleAbideTextVisibility(
  current: AbideTextVisibility,
): AbideTextVisibility {
  if (current === "normal") {
    return "dim";
  }

  if (current === "dim") {
    return "off";
  }

  return "normal";
}
