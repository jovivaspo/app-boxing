// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { createHtmlAudioBellAdapter } from "../bell.adapter";

describe("createHtmlAudioBellAdapter", () => {
  let audioInstances: Array<{
    currentTime: number;
    src: string;
    play: ReturnType<typeof vi.fn>;
  }> = [];

  function installFakeAudio(
    playImpl: () => Promise<void> = () => Promise.resolve()
  ) {
    audioInstances = [];
    function FakeAudio(
      this: {
        currentTime: number;
        src: string;
        play: ReturnType<typeof vi.fn>;
      },
      src?: string
    ) {
      this.currentTime = 0;
      this.src = src ?? "";
      this.play = vi.fn(playImpl);
      audioInstances.push(this);
    }
    vi.stubGlobal("Audio", FakeAudio);
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should not construct an Audio instance until the first ring() call", () => {
    installFakeAudio();

    createHtmlAudioBellAdapter();

    expect(audioInstances).toHaveLength(0);
  });

  it("should construct exactly one Audio instance across multiple ring() calls", () => {
    installFakeAudio();
    const bell = createHtmlAudioBellAdapter();

    bell.ring();
    bell.ring();

    expect(audioInstances).toHaveLength(1);
  });

  it("should rewind currentTime to 0 before replaying", () => {
    installFakeAudio();
    const bell = createHtmlAudioBellAdapter();

    bell.ring();
    audioInstances[0].currentTime = 5;
    bell.ring();

    expect(audioInstances[0].currentTime).toBe(0);
  });

  it("should not throw when play() rejects", () => {
    installFakeAudio(() =>
      Promise.reject(new Error("blocked by autoplay policy"))
    );
    const bell = createHtmlAudioBellAdapter();

    expect(() => bell.ring()).not.toThrow();
  });

  it("should not produce an unhandled rejection when play() rejects", async () => {
    const onUnhandledRejection = vi.fn();
    process.on("unhandledRejection", onUnhandledRejection);
    installFakeAudio(() =>
      Promise.reject(new Error("blocked by autoplay policy"))
    );
    const bell = createHtmlAudioBellAdapter();

    bell.ring();
    await new Promise((resolve) => setTimeout(resolve, 0));

    process.off("unhandledRejection", onUnhandledRejection);
    expect(onUnhandledRejection).not.toHaveBeenCalled();
  });
});
