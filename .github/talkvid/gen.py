#!/usr/bin/env python3
"""Generate a talking-person vertical video with Wav2Lip on CPU (GitHub Actions).

Flow:
  1. edge-tts  -> speech.wav (free neural TTS)
  2. Wav2Lip   -> lip-syncs blogs/img/person/person.jpg to speech.wav
  3. ffmpeg    -> normalize to 1080x1920 H.264 MP4
Output path is written to stdout as: TALKVID_MP4=<path>
Falls back (exit 3) if person.jpg is missing so caller can use slideshow MP4.
"""
import os, sys, subprocess, asyncio
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".github" / "talkvid" / "work"
WORK.mkdir(parents=True, exist_ok=True)
PERSON = ROOT / "blogs" / "img" / "person" / "person.jpg"
WAV2LIP = WORK / "Wav2Lip"
CKPT = WORK / "wav2lip.pth"
OUT = ROOT / "blogs" / "img" / "talkvid.mp4"

SCRIPT_TEXT = os.environ.get("TALKVID_TEXT", "").strip()
if not SCRIPT_TEXT:
    print("TALKVID_TEXT empty -> fallback", flush=True); sys.exit(3)
if not PERSON.exists():
    print("person.jpg missing -> fallback", flush=True); sys.exit(3)

VOICE = os.environ.get("TALKVID_VOICE", "en-US-ChristopherNeural")  # deep US male
CKPT_URL = "https://github.com/justinjohn0306/Wav2Lip/releases/download/models/wav2lip.pth"

def sh(*cmd, check=True):
    print("+", " ".join(map(str, cmd)), flush=True)
    return subprocess.run(list(map(str, cmd)), check=check)

async def tts():
    import edge_tts
    audio = WORK / "speech.mp3"
    await edge_tts.Communicate(SCRIPT_TEXT, VOICE, rate="+8%").save(str(audio))
    sh("ffmpeg", "-y", "-i", audio, "-ac", "1", "-ar", "16000",
       "-af", "silenceremove=1:0:-40dB,apad=whole_dur=4", WORK / "speech.wav")
    return WORK / "speech.wav"

def main():
    wav = asyncio.run(tts())

    if not WAV2LIP.exists():
        sh("git", "clone", "--depth", "1",
           "https://github.com/justinjohn0306/Wav2Lip.git", WAV2LIP)
    if not CKPT.exists():
        sh("curl", "-L", "-o", CKPT, CKPT_URL)

    # Wav2Lip works on a 25fps video of the still image
    raw = WORK / "base.mp4"
    sh("ffmpeg", "-y", "-loop", "1", "-i", PERSON, "-t", "10", "-r", "25",
       "-vf", "scale=960:-2,pad=960:960:(ow-iw)/2:(oh-ih)/2", "-pix_fmt", "yuv420p", raw)

    lip = WORK / "lip.mp4"
    sh("python", WAV2LIP / "inference.py",
       "--checkpoint_path", CKPT, "--face", raw, "--audio", wav,
       "--outfile", lip, "--pads", "0", "10", "0", "0", "--nosmooth")

    # upscale/pad to vertical 1080x1920 with the face video on a blurred canvas
    sh("ffmpeg", "-y", "-i", lip, "-i", wav,
       "-filter_complex",
       "[0:v]scale=1080:-2[fg];"
       "color=c=black:s=1080x1920:d=99[bg];"
       "[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1[v]",
       "-map", "[v]", "-map", "1:a", "-t", "10",
       "-c:v", "libx264", "-preset", "fast", "-crf", "20",
       "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart", OUT)

    print(f"TALKVID_MP4={OUT}", flush=True)

if __name__ == "__main__":
    main()
