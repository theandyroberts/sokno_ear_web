#!/usr/bin/env python3
"""Lay the Ear's music under the weekend briefing (Andy, 2026-11-02).

A barely-there bed under the open. At each change of place the music rises under the
last sentence, peaks in a tiny pause, and fades out under the next story. It swells over
the sign-off and plays to the track's natural ending. Words are never touched.

  python3 scripts/audio-mix.py out.mp3 --open-end 11.1 --signoff 31.96 \
      feature.mp3 old-sevier.mp3 kerns.mp3 ijams.mp3 earls-and-signoff.mp3

Each input is one place, read in order, cut in the middle of the silence between stories.
--open-end is where the greeting stops in the first file; --signoff is where the sign-off
starts in the last, both in seconds (ffmpeg's silencedetect finds them). Check each take with
speech_to_text. I can't hear the result, so Andy judges it; the levels below are the ones he approved.
"""
import argparse
import subprocess

import numpy as np

SR = 44100
MUSIC = "assets/soknoear-music-28s.mp3"

BED_DB = -30        # under the open: "hmm, I think I hear banjo"
UNDER_DB = -24      # under the last sentence and the next place's name
PEAK_DB = -13       # in the pause, with the voice silent
PAUSE = 0.15        # added to the silence already at each cut
RISE = 4.5          # seconds before the cut that the music starts to rise
FADE = 7.5          # seconds after the cut that it is gone
HIT = 16.0          # a hit in the track, which lands in the pause
TAIL = 5.0          # seconds of music after the last word
SWELL_DB = (-24, -17, -4)  # at the sign-off, at the last word, once the voice has stopped


def load(path):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"])
    return np.frombuffer(raw, "int16").astype(np.float32) / 32768


def db(value):
    return 10 ** (value / 20)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("sections", nargs="+", help="one audio file per place, in order")
    ap.add_argument("--open-end", type=float, required=True)
    ap.add_argument("--signoff", type=float, required=True)
    ap.add_argument("--music", default=MUSIC)
    args = ap.parse_args()

    parts, cuts, last_start, at = [], [], 0.0, 0
    for i, path in enumerate(args.sections):
        section = load(path)
        if i:
            cuts.append(at / SR)
            gap = np.zeros(int(PAUSE * SR), np.float32)
            parts.append(gap)
            at += len(gap)
        last_start = at / SR
        parts.append(section)
        at += len(section)
    voice = np.concatenate(parts)
    voice_end = len(voice) / SR
    total = voice_end + TAIL

    track = load(args.music)
    music = np.zeros(int(total * SR) + SR, np.float32)

    def place(start, offset, duration, times, gains):
        first = int(start * SR)
        count = int(duration * SR)
        clip = track[int(offset * SR):int(offset * SR) + count]
        count = min(len(clip), len(music) - first)
        env = np.interp(np.arange(count) / SR + start, times, gains)
        music[first:first + count] += clip[:count] * env

    end = args.open_end
    place(0, 0, end + 4, [0, 1.5, end, end + 3.5], [0, db(BED_DB), db(BED_DB), 0])

    for b in cuts:
        place(b - RISE, HIT - RISE, RISE + FADE + 0.5,
              [b - RISE, b - 0.45, b - 0.3, b + 0.1, b + 0.5, b + FADE],
              [0, db(UNDER_DB), db(PEAK_DB), db(PEAK_DB), db(UNDER_DB), 0])

    signoff = last_start + args.signoff
    start = total - len(track) / SR
    offset = max(0, -start)
    start = max(0, start)
    place(start, offset, total - start,
          [signoff - 1.5, signoff, voice_end, voice_end + 0.8, total],
          [0, db(SWELL_DB[0]), db(SWELL_DB[1]), db(SWELL_DB[2]), db(SWELL_DB[2])])

    mix = music[:int(total * SR)].copy()
    mix[:len(voice)] += voice
    peak = float(np.abs(mix).max())
    if peak > 0.97:
        mix *= 0.97 / peak
    encode = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                               "-c:a", "libmp3lame", "-b:a", "192k", args.out], stdin=subprocess.PIPE)
    encode.communicate(mix.astype("<f4").tobytes())
    print(f"{args.out}: {total:.1f} s, {len(cuts)} changes of place, peak {peak:.2f}")


if __name__ == "__main__":
    main()
