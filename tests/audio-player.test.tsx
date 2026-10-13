import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioBriefingPlayer } from "@/components/AudioBriefingPlayer";

describe("AudioBriefingPlayer", () => {
  it("renders title + intro and an audio element with the src", () => {
    const { container } = render(
      <AudioBriefingPlayer title="Weekend Audio Briefing" intro="Hi neighbors."
        description="d" duration="01:30" src="/audio/2026-06-20.mp3" />
    );
    expect(screen.getByText("Weekend Audio Briefing")).toBeInTheDocument();
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio).toBeTruthy();
    expect(audio.getAttribute("src")).toBe("/audio/2026-06-20.mp3");
  });
  it("toggles play on button click", () => {
    const play = vi.fn(); const pause = vi.fn();
    HTMLMediaElement.prototype.play = play as any;
    HTMLMediaElement.prototype.pause = pause as any;
    render(<AudioBriefingPlayer intro="i" description="d" duration="01:30" src="/a.mp3" />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(play).toHaveBeenCalled();
  });

  // Listening is counted in the web stats (Andy, 2026-10-13). Umami's script puts
  // `umami.track` on window in production; the player sends one play per visit, a
  // halfway mark and a finish, each tagged with the episode.
  describe("stats events", () => {
    const setup = () => {
      HTMLMediaElement.prototype.play = vi.fn() as any;
      HTMLMediaElement.prototype.pause = vi.fn() as any;
      const trackFn = vi.fn();
      (window as any).umami = { track: trackFn };
      const { container } = render(<AudioBriefingPlayer intro="i" description="d" duration="04:56" src="/audio/2026-10-14.mp3" />);
      const audio = container.querySelector("audio") as HTMLAudioElement;
      return { trackFn, audio };
    };
    afterEach(() => { delete (window as any).umami; });

    it("sends audio-play with the episode slug on the first press of play, once per visit", () => {
      const { trackFn } = setup();
      // jsdom's mocked play() never flips `paused`, so the one button is pressed three
      // times by role alone: play, (what the page calls) pause, play again.
      const button = screen.getByRole("button");
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      expect(trackFn).toHaveBeenCalledTimes(1);
      expect(trackFn).toHaveBeenCalledWith("audio-play", { episode: "2026-10-14" });
    });

    it("sends audio-half once the listener is past the middle, and audio-finish at the end", () => {
      const { trackFn, audio } = setup();
      Object.defineProperty(audio, "duration", { value: 296, configurable: true });
      Object.defineProperty(audio, "currentTime", { value: 100, configurable: true, writable: true });
      fireEvent.timeUpdate(audio);
      expect(trackFn).not.toHaveBeenCalledWith("audio-half", expect.anything());
      (audio as any).currentTime = 150;
      fireEvent.timeUpdate(audio);
      (audio as any).currentTime = 200;
      fireEvent.timeUpdate(audio);
      expect(trackFn.mock.calls.filter((c) => c[0] === "audio-half")).toHaveLength(1);
      fireEvent.ended(audio);
      expect(trackFn).toHaveBeenCalledWith("audio-finish", { episode: "2026-10-14" });
    });

    it("plays fine when no stats script is on the page", () => {
      HTMLMediaElement.prototype.play = vi.fn() as any;
      delete (window as any).umami;
      render(<AudioBriefingPlayer intro="i" description="d" duration="01:00" src="/a.mp3" />);
      expect(() => fireEvent.click(screen.getByRole("button", { name: /play/i }))).not.toThrow();
    });
  });
});
