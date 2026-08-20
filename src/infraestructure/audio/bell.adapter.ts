import type { BellPort } from "@/application/ports/bell.port";

export function createHtmlAudioBellAdapter(src = "/sounds/bell.mp3"): BellPort {
  let audio: HTMLAudioElement | null = null;

  return {
    ring(): void {
      try {
        audio ??= new Audio(src);
        audio.currentTime = 0;
        void audio.play().catch((error) => {
          console.error("Bell playback failed", error);
        });
      } catch (error) {
        console.error("Bell playback failed", error);
      }
    },
  };
}
