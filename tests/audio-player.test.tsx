import { describe, it, expect, vi } from "vitest";
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
});
