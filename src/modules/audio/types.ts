import type { ChunkAudioRef } from "@/types";

export type ChunkAudioStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface ChunkAudioController {
  tracks: ChunkAudioRef[];
  currentTrack: ChunkAudioRef | null;
  currentTrackIndex: number;
  hasMultipleTracks: boolean;
  status: ChunkAudioStatus;
  currentTime: number;
  duration: number;
  progress: number;
  error: string | null;
  play: () => Promise<void>;
  pause: () => void;
  togglePlayback: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  selectTrack: (index: number) => Promise<void>;
}
